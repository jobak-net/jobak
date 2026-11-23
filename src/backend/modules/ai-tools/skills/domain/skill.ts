/** A skill's manifest (`<name>/skill.json` in the skills repository), as stored. */
export interface SkillManifest {
  name: string;
  title: string;
  description: string;
  latest: string;
  versions: { version: string; date: string; notes: string }[];
}

/**
 * Where skills are kept. A port: today their own GitHub repository
 * (`GitHubSkillRepository`, jobak-net/career-agent-skills); a database or an
 * object store later wouldn't change the use cases.
 */
export interface SkillRepository {
  /** The manifest, or null when there's no such skill. Throws when it exists but is malformed. */
  manifest(name: string): Promise<SkillManifest | null>;
  /** One version's `SKILL.md`, or null when its file is missing. Callers check the version is listed first. */
  content(name: string, version: string): Promise<string | null>;
}

/** Sorts `x.y.z` versions newest first. */
export function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
