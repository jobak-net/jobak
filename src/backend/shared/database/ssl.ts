import { readFileSync } from "node:fs";
import type { ConnectionOptions } from "node:tls";

/**
 * TLS settings for a Postgres connection — shared by the app's pool and the
 * migration script (`scripts/db/migration.ts`), which connect to the same
 * database with the same credentials. A second copy of this rule is one that
 * drifts.
 *
 * Deliberately no `server-only` import: that package throws when loaded outside
 * Next's server bundle, and the migration script runs under plain `tsx`.
 *
 * ── Supabase ────────────────────────────────────────────────
 * Supabase's pooler presents a chain rooted at "Supabase Root 2021 CA", which
 * is not in any public trust store — so the default trust store rejects it with
 * "self-signed certificate in certificate chain". The usual workaround is
 * `rejectUnauthorized: false`, which keeps the traffic encrypted but stops
 * verifying *who* terminated it: that is, it accepts any endpoint able to
 * intercept the connection, which is what TLS exists to prevent.
 *
 * Since the database carries user data and encrypted API keys, the right fix
 * is the CA, not the opt-out. Supabase publishes it: Dashboard → Project
 * Settings → Database → SSL Configuration → download the certificate, save it
 * in the repo, and point `SUPABASE_DB_CA_CERT` at the path (or paste the PEM
 * into `SUPABASE_DB_CA_CERT_PEM`, which is easier on hosts with no filesystem
 * to write to).
 *
 * Without one of those set, this refuses to run in production and falls back to
 * unverified TLS in development with a warning — so a missing certificate is
 * loud and temporary, never the quiet permanent default.
 *
 * ── Local Postgres ──────────────────────────────────────────
 * A database on localhost, or one whose URL says `sslmode=disable` — a Postgres
 * container next to a self-hosted instance, say — has no TLS to negotiate, and
 * insisting on it would fail the connection outright. Both are an explicit
 * statement about where the database is, so no certificate is asked for.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isPlaintextDatabase(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return (
      url.searchParams.get("sslmode") === "disable" ||
      LOCAL_HOSTS.has(url.hostname)
    );
  } catch {
    // Unparseable here is the caller's error to report, not this function's.
    return false;
  }
}

export function resolveSslConfig(
  connectionString: string,
): ConnectionOptions | false {
  if (isPlaintextDatabase(connectionString)) return false;

  const pem = process.env.SUPABASE_DB_CA_CERT_PEM;
  const path = process.env.SUPABASE_DB_CA_CERT;

  if (pem) {
    return { ca: pem, rejectUnauthorized: true };
  }

  if (path) {
    return { ca: readFileSync(path, "utf8"), rejectUnauthorized: true };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No database CA certificate configured. Set SUPABASE_DB_CA_CERT to the " +
        "path of Supabase's CA certificate (Dashboard → Project Settings → " +
        "Database → SSL Configuration), or SUPABASE_DB_CA_CERT_PEM to its contents. " +
        "Connecting without verification would leave the connection open to " +
        "interception, and it carries user data and encrypted API keys.",
    );
  }

  console.warn(
    "[db] No SUPABASE_DB_CA_CERT set — TLS is encrypted but UNVERIFIED. " +
      "Fine for local development; set the CA before deploying.",
  );
  return { rejectUnauthorized: false };
}
