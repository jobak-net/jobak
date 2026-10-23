#!/usr/bin/env node
/**
 * Sends one real verification email, to check deliverability.
 *
 *   pnpm resend:test you@example.com            preview only
 *   pnpm resend:test you@example.com --send     actually send
 *
 * Dry run by default. This spends real quota and puts a real message in
 * somebody's inbox, so firing it has to be deliberate.
 *
 * ── Why not just register through the app ───────────────────
 * Registering would write a user row, mint a real token and need the database
 * up. None of that is being tested here. This posts the same template, from
 * the same address, through the same API, with a link shaped like a real one —
 * which is all that spam placement depends on.
 *
 * The link is deliberately NOT a working token: anyone who intercepts this
 * test should not get a usable credential.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Imported rather than re-read from the HTML: this must test the bytes that
 * actually ship, logo attachment included. The generated module has no
 * `server-only` guard, so a script can load it.
 */
import {
  LOGO_ATTACHMENT,
  VERIFY_EMAIL,
} from "../../src/backend/modules/auth/infrastructure/email/templates.generated";

const ENDPOINT = "https://api.resend.com/emails";

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

function fail(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const to = args.find((a) => !a.startsWith("--"));

  if (!to) fail("Pass a recipient: pnpm resend:test you@example.com");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  const templateId = process.env.RESEND_TEMPLATE_VERIFY_EMAIL?.trim() || null;

  if (!apiKey) {
    fail(
      "RESEND_API_KEY is empty or unset.\n" +
        "  If it has a value in .env, check whether .env.local declares it as\n" +
        "  empty — .env.local wins, and an empty string counts as defined.",
    );
  }
  if (!from) {
    fail(
      'AUTH_EMAIL_FROM is not set. Use an address on your VERIFIED domain,\n' +
        '  e.g. AUTH_EMAIL_FROM="Jobak <hello@no-reply.jobak.net>"',
    );
  }

  /*
   * Mirrors what the real link looks like without being one. A token-shaped
   * string keeps the URL length and structure realistic, which matters: some
   * filters score on link shape, and a bare origin would not be a fair test.
   */
  const link = `${process.env.AUTH_APP_URL ?? "http://localhost:3000"}/api/v1/auth/verify-email?token=TEST-NOT-A-REAL-TOKEN-0000000000000000`;

  const subject = VERIFY_EMAIL.subject;

  const hostedLogo = process.env.AUTH_EMAIL_LOGO_URL?.trim();
  const logoSrc = hostedLogo || `cid:${LOGO_ATTACHMENT.contentId}`;

  const base: Record<string, unknown> = { from, to, subject };

  if (!hostedLogo) {
    base.attachments = [
      {
        content: LOGO_ATTACHMENT.base64,
        filename: LOGO_ATTACHMENT.filename,
        content_type: LOGO_ATTACHMENT.contentType,
        content_id: LOGO_ATTACHMENT.contentId,
      },
    ];
  }

  let body: Record<string, unknown>;

  if (templateId) {
    body = {
      ...base,
      template: { id: templateId, variables: { LINK: link, LOGO: logoSrc } },
    };
  } else {
    body = {
      ...base,
      html: VERIFY_EMAIL.html
        .replaceAll("{{link}}", link)
        .replaceAll("{{logo}}", logoSrc),
    };
  }

  console.log(`\n  from:     ${from}`);
  console.log(`  to:       ${to}`);
  console.log(`  subject:  ${subject}`);
  console.log(`  path:     ${templateId ? `Resend template ${templateId}` : "inline HTML"}`);
  console.log(`  link:     ${link.slice(0, 60)}…`);
  console.log(`  logo:     ${logoSrc}${hostedLogo ? "" : " (attached)"}`);

  if (!send) {
    console.log("\n  Dry run. Re-run with --send to actually deliver.\n");
    return;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    const detail = String(data.message ?? data.name ?? "no detail");

    console.error(`\n✗ Resend rejected it (${response.status}): ${detail}`);

    if (response.status === 403) {
      console.error(
        "\n  403 almost always means the domain in AUTH_EMAIL_FROM is not\n" +
          "  verified. Without a verified domain the only usable sender is\n" +
          "  onboarding@resend.dev, and it can ONLY deliver to the address on\n" +
          "  your Resend account.",
      );
    }
    if (/domain is not verified/i.test(detail)) {
      console.error("\n  Check Domains in the dashboard — it must say Verified.");
    }
    process.exit(1);
  }

  console.log(`\n✓ Accepted by Resend. id=${data.id ?? "unknown"}`);
  console.log(`
  Now check where it landed:

  1. Open it in Gmail. If it is in Spam, note the reason Gmail shows at the top.
  2. Three-dot menu > "Show original". You want all three:
       SPF:   PASS
       DKIM:  PASS
       DMARC: PASS
     A DKIM fail means the resend._domainkey record is wrong or still
     propagating. An SPF fail usually means the send subdomain's TXT is missing.
  3. Resend's dashboard shows delivered/bounced/complained per message.

  A brand-new sending domain has no reputation, so early mail can land in spam
  even with all three passing. That improves with consistent volume — it is not
  necessarily a misconfiguration.`);
}

main().catch((error: unknown) => {
  console.error(
    "\nFailed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
