import "server-only";

import { z } from "zod";

import { ServiceUnavailableError } from "@/backend/shared/exceptions";
import { enforceRateLimit } from "@/backend/shared/rate-limit";
import { SKILL_NAME_PATTERN, SKILL_VERSION_PATTERN } from "@/shared/contracts/skills";

import type { SkillManifest, SkillRepository } from "../domain/skill";

/** Where the skills live: a GitHub repository and a branch (or tag, or commit). */
export interface SkillsSource {
  /** `owner/name`. */
  repo: string;
  ref: string;
  /** Only for a private repository: a token that can read it. Never logged. */
  token?: string;
}

export const SKILLS_SOURCE_DEFAULTS = { repo: "jobak-net/career-agent-skills", ref: "main" } as const;

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const REF_PATTERN = /^(?!.*\.\.)[\w./-]+$/;

/**
 * The source in force: `SKILLS_REPO`, `SKILLS_REF` and `SKILLS_GITHUB_TOKEN`,
 * each falling back to the default. A value that isn't a repository or a ref
 * is logged and ignored, so a typo can't point the URL somewhere else.
 */
export function resolveSkillsSource(env: Record<string, string | undefined> = process.env): SkillsSource {
  const pick = (key: string, pattern: RegExp, fallback: string) => {
    const value = env[key]?.trim();
    if (!value) return fallback;
    if (pattern.test(value)) return value;
    console.warn(`[skills] ${key}="${value}" isn't valid; using ${fallback}`);
    return fallback;
  };
  return {
    repo: pick("SKILLS_REPO", REPO_PATTERN, SKILLS_SOURCE_DEFAULTS.repo),
    ref: pick("SKILLS_REF", REF_PATTERN, SKILLS_SOURCE_DEFAULTS.ref),
    token: env.SKILLS_GITHUB_TOKEN?.trim() || undefined,
  };
}

const manifestSchema = z.object({
  name: z.string().regex(SKILL_NAME_PATTERN),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  latest: z.string().regex(SKILL_VERSION_PATTERN),
  versions: z
    .array(
      z.object({
        version: z.string().regex(SKILL_VERSION_PATTERN),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).default(""),
      }),
    )
    .min(1),
}) satisfies z.ZodType<SkillManifest, unknown>;

/** How long a manifest is trusted before it's read again: a new release shows up within this. */
const MANIFEST_TTL_MS = 5 * 60_000;
/** After a failed re-read, how long the last good manifest keeps serving before the next try. */
const RETRY_AFTER_MS = 30_000;
const TIMEOUT_MS = 8_000;

interface Dependencies {
  fetch: typeof fetch;
  /** Counts one call to GitHub (`enforceRateLimit("skills-github", …)`); throws when over. */
  countCall: () => Promise<unknown>;
  now: () => number;
}

/**
 * Skills read from their own GitHub repository (by default
 * jobak-net/career-agent-skills, branch `main`):
 *
 *   <name>/skill.json                    the manifest
 *   <name>/versions/<x.y.z>/SKILL.md     one version
 *
 * Fetched from `raw.githubusercontent.com` and cached in memory:
 *  - a manifest for `MANIFEST_TTL_MS`. When a re-read fails (GitHub down, our
 *    limit, a malformed push), the last good one keeps serving and the error
 *    is logged; with nothing cached the error goes up (a 503);
 *  - a version's content for good, since a released version never changes
 *    (the skills repository's README says so).
 *
 * Concurrent reads of the same file share one request. Paths are built only
 * from a name and a version that match their patterns. A file GitHub doesn't
 * have is `null` (a 404 upstream), and so is a private repository read
 * without `SKILLS_GITHUB_TOKEN`.
 */
export class GitHubSkillRepository implements SkillRepository {
  private readonly manifests = new Map<string, { value: SkillManifest | null; expires: number }>();
  private readonly contents = new Map<string, string>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly deps: Dependencies;

  constructor(
    private readonly source: SkillsSource = resolveSkillsSource(),
    deps: Partial<Dependencies> = {},
  ) {
    this.deps = {
      fetch: deps.fetch ?? ((...args) => fetch(...args)),
      countCall: deps.countCall ?? (() => enforceRateLimit("skills-github", "global")),
      now: deps.now ?? Date.now,
    };
  }

  async manifest(name: string): Promise<SkillManifest | null> {
    assertName(name);
    const cached = this.manifests.get(name);
    if (cached && cached.expires > this.deps.now()) return cached.value;

    try {
      const value = await this.once(`manifest:${name}`, async () => {
        const raw = await this.fetchText(`${name}/skill.json`);
        return raw === null ? null : parseManifest(name, raw);
      });
      this.manifests.set(name, { value, expires: this.deps.now() + MANIFEST_TTL_MS });
      return value;
    } catch (error) {
      if (!cached) throw error;
      console.error(`[skills] re-reading ${name}/skill.json failed; serving the last good copy: ${(error as Error).message}`);
      this.manifests.set(name, { value: cached.value, expires: this.deps.now() + RETRY_AFTER_MS });
      return cached.value;
    }
  }

  async content(name: string, version: string): Promise<string | null> {
    assertName(name);
    if (!SKILL_VERSION_PATTERN.test(version)) throw new Error(`Not a skill version: ${version}`);
    const key = `${name}@${version}`;
    const cached = this.contents.get(key);
    if (cached !== undefined) return cached;

    const text = await this.once(`content:${key}`, () => this.fetchText(`${name}/versions/${version}/SKILL.md`));
    if (text !== null) this.contents.set(key, text);
    return text;
  }

  /** One file's text; null when GitHub has no such file. Anything else is a 503. */
  private async fetchText(path: string): Promise<string | null> {
    await this.deps.countCall();
    const url = `https://raw.githubusercontent.com/${this.source.repo}/${this.source.ref}/${path}`;

    let response: Response;
    try {
      response = await this.deps.fetch(url, {
        headers: this.source.token ? { Authorization: `token ${this.source.token}` } : undefined,
        // Our own cache above decides freshness; Next's data cache stays out of it.
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new ServiceUnavailableError(`GitHub didn't answer for ${path}: ${(error as Error).message}`);
    }

    if (response.status === 404) return null;
    if (!response.ok) throw new ServiceUnavailableError(`GitHub answered ${response.status} for ${path}`);
    return response.text();
  }

  private once<T>(key: string, run: () => Promise<T>): Promise<T> {
    const pending = this.inFlight.get(key) as Promise<T> | undefined;
    if (pending) return pending;
    const promise = run().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }
}

function assertName(name: string) {
  if (!SKILL_NAME_PATTERN.test(name)) throw new Error(`Not a skill name: ${name}`);
}

/** A malformed manifest throws: it's ours to fix in the skills repository. */
function parseManifest(name: string, raw: string): SkillManifest {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`${name}/skill.json isn't valid JSON`);
  }
  const parsed = manifestSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    throw new Error(`${name}/skill.json is malformed: ${issues}`);
  }
  if (parsed.data.name !== name) throw new Error(`${name}/skill.json names itself "${parsed.data.name}"`);
  return parsed.data;
}
