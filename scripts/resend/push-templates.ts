#!/usr/bin/env node
/**
 * Creates (or updates) the auth templates in Resend and publishes them.
 *
 *   pnpm resend:templates            create/update, then publish
 *   pnpm resend:templates --dry-run  show what would be sent, call nothing
 *
 * Reads the generated HTML from email-templates/resend_templates/, which
 * `node email-templates/build.mjs` writes. Edit build.mjs, never the HTML.
 *
 * ── Why a script and not the dashboard ──────────────────────
 * The markup is generated from one shell shared with the app's inline copies.
 * Pasting it by hand is how the two drift, and a template that drifts is one
 * nobody notices is wrong until a user gets an ugly email.
 *
 * Templates are addressed by `alias`, which is stable and ours to choose, so
 * re-running this updates the same two templates rather than piling up copies.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.resend.com/templates";
const SOURCE_DIR = join(process.cwd(), "email-templates", "resend_templates");

/**
 * Must match `RESEND_LINK` in email-templates/build.mjs and `LINK_VARIABLE` in
 * the sender. Three places, one string — the alternative is a shared constant
 * importable from a script, a build file and `server-only` code, which is more
 * coupling than one name is worth. The check below is what keeps them honest.
 */
const LINK_VARIABLE = "LINK";
const LOGO_VARIABLE = "LOGO";

interface TemplateSpec {
  /** Stable, ours, and what the env var should hold. */
  alias: string;
  name: string;
  subject: string;
  file: string;
  envVar: string;
}

const TEMPLATES: TemplateSpec[] = [
  {
    alias: "jobak-verify-email",
    name: "Jobak — verify email",
    subject: "Confirm your email address for Jobak",
    file: "verify-email.html",
    envVar: "RESEND_TEMPLATE_VERIFY_EMAIL",
  },
  {
    alias: "jobak-reset-password",
    name: "Jobak — reset password",
    subject: "Reset your Jobak password",
    file: "reset-password.html",
    envVar: "RESEND_TEMPLATE_RESET_PASSWORD",
  },
];

/** Next's precedence: .env.local before .env, first definition wins. */
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    let content: string;
    try {
      content = readFileSync(join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key in process.env) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

async function call(
  path: string,
  method: string,
  apiKey: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return { ok: response.ok, status: response.status, data };
}

async function main() {
  loadEnv();

  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey && !dryRun) {
    throw new Error(
      "RESEND_API_KEY is not set. Create one at https://resend.com/api-keys " +
        "and put it in .env. Run with --dry-run to preview without it.",
    );
  }

  const results: { envVar: string; id: string }[] = [];

  for (const t of TEMPLATES) {
    const html = readFileSync(join(SOURCE_DIR, t.file), "utf8");

    /*
     * Guard, not decoration. Resend interpolates three braces; two render
     * literally. An upload carrying `{{link}}` produces a button pointing at
     * the text "{{link}}" — an email that looks fine in the dashboard preview
     * and is broken for every recipient.
     */
    for (const v of [LINK_VARIABLE, LOGO_VARIABLE]) {
      if (!html.includes(`{{{${v}}}}`)) {
        throw new Error(
          `${t.file} does not contain {{{${v}}}}. Run ` +
            `"node email-templates/build.mjs" first — and do not hand-edit the ` +
            `generated HTML.`,
        );
      }
    }

    const payload = {
      name: t.name,
      alias: t.alias,
      subject: t.subject,
      html,
      variables: [
        {
          key: LINK_VARIABLE,
          type: "string" as const,
          /*
           * No fallback. A missing link is not something to paper over with a
           * placeholder URL — Resend refusing the send is the correct outcome,
           * because an email whose only action is wrong is worse than none.
           */
        },
        {
          key: LOGO_VARIABLE,
          type: "string" as const,
          /*
           * Also no fallback, for a different reason: the sender decides
           * between a cid: reference and a hosted URL, and a fallback here
           * would quietly win whenever that value failed to arrive — producing
           * a broken image rather than a refused send.
           */
        },
      ],
    };

    console.log(`\n${t.alias}`);
    console.log(`  name:      ${t.name}`);
    console.log(`  subject:   ${t.subject}`);
    console.log(`  html:      ${html.length} bytes from ${t.file}`);
    console.log(`  variables: ${LINK_VARIABLE} (string, required)`);

    if (dryRun) {
      console.log("  --dry-run: nothing sent.");
      continue;
    }

    // Create, falling back to update when the alias is already taken. Resend
    // has no upsert, and a 409 here means "you already ran this", not a fault.
    let created = await call("", "POST", apiKey!, payload);

    if (!created.ok && created.status === 409) {
      console.log("  exists — updating in place");
      created = await call(`/${t.alias}`, "PATCH", apiKey!, payload);
    }

    if (!created.ok) {
      throw new Error(
        `  FAILED (${created.status}): ${
          created.data.message ?? created.data.name ?? "no detail"
        }`,
      );
    }

    const id = String(created.data.id ?? t.alias);

    // Only published templates can be used in a send.
    const published = await call(`/${t.alias}/publish`, "POST", apiKey!);
    if (!published.ok) {
      throw new Error(
        `  created but NOT published (${published.status}): ${
          published.data.message ?? "no detail"
        }`,
      );
    }

    console.log(`  published  id=${id}`);
    results.push({ envVar: t.envVar, id });
  }

  if (results.length > 0) {
    console.log("\nAdd these to .env to send through Resend's copies:\n");
    for (const r of results) console.log(`${r.envVar}=${r.id}`);
    console.log(
      "\nLeave them unset and the app keeps sending the identical HTML inline,\n" +
        "which is what a self-hosted copy without your Resend account does.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    "\nFailed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
