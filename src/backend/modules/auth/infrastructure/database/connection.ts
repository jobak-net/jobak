import "server-only";

import { readFileSync } from "node:fs";
import { Pool } from "pg";

/**
 * The application's Postgres connection.
 *
 * Until now the only `pg` client in this repo was the migration script, which
 * opens a connection, runs, and exits. This is the opposite case — a long-lived
 * pool serving requests — so it is shaped accordingly.
 *
 * `server-only` makes an accidental import from a client component a build
 * error rather than a runtime surprise: this module reads the database URL, and
 * bundling that into browser JavaScript would be the worst kind of leak.
 *
 * Query helpers live in `./client`; this file is only about getting and
 * configuring the connection.
 */

/**
 * Cached on `globalThis` because Next's dev server re-evaluates modules on
 * every hot reload. A module-level `new Pool()` would therefore leak a fresh
 * pool per edit until Postgres refuses new connections — the classic dev-only
 * "too many clients already" failure, which never reproduces in production and
 * so tends to get misdiagnosed.
 */
const globalForPool = globalThis as unknown as { authPool?: Pool };

function connectionString(): string {
  const url = process.env.SUPABASE_DB_URL;

  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL is not set. It is the Postgres connection string from " +
        "the Supabase dashboard (Project Settings → Database → Connection string → URI), " +
        "not the API URL or anon key.",
    );
  }

  /*
   * The placeholder this repo shipped with parses as a valid-but-meaningless
   * connection string: `pg` falls back to libpq defaults and tries to resolve a
   * host literally named "base", producing `getaddrinfo ENOTFOUND base`, which
   * says nothing about the real problem. Fail with something actionable.
   */
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error(
      `SUPABASE_DB_URL does not look like a connection string (got "${url.slice(0, 12)}…"). ` +
        "It must start with postgresql:// or postgres://.",
    );
  }

  return url;
}

/**
 * TLS settings for the connection.
 *
 * Supabase's pooler presents a chain rooted at "Supabase Root 2021 CA", which
 * is not in any public trust store — so the default trust store rejects it with
 * "self-signed certificate in certificate chain". The usual workaround is
 * `rejectUnauthorized: false`, which keeps the traffic encrypted but stops
 * verifying *who* terminated it: that is, it accepts any endpoint able to
 * intercept the connection, which is what TLS exists to prevent.
 *
 * Since the database carries password hashes and session tokens, the right fix
 * is the CA, not the opt-out. Supabase publishes it: Dashboard → Project
 * Settings → Database → SSL Configuration → download the certificate, save it
 * in the repo, and point `SUPABASE_DB_CA_CERT` at the path (or paste the PEM
 * into `SUPABASE_DB_CA_CERT_PEM`, which is easier on hosts with no filesystem
 * to write to).
 *
 * Without one of those set, this refuses to run in production and falls back to
 * unverified TLS in development with a warning — so a missing certificate is
 * loud and temporary, never the quiet permanent default.
 */
function sslConfig() {
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
        "interception, and it carries password hashes and session tokens.",
    );
  }

  console.warn(
    "[auth/db] No SUPABASE_DB_CA_CERT set — TLS is encrypted but UNVERIFIED. " +
      "Fine for local development; set the CA before deploying.",
  );
  return { rejectUnauthorized: false };
}

export function getPool(): Pool {
  if (globalForPool.authPool) return globalForPool.authPool;

  const pool = new Pool({
    connectionString: connectionString(),
    ssl: sslConfig(),

    /*
     * Serverless functions are many, short-lived and independent, so a large
     * per-instance pool multiplies into far more Postgres connections than the
     * project allows. Small pools, recycled quickly, are the right shape.
     */
    max: 10,
    idleTimeoutMillis: 30_000,

    // Fail a stuck connect rather than hanging the request until the platform
    // kills it — a timeout is diagnosable, a hang is not.
    connectionTimeoutMillis: 10_000,
  });

  /*
   * A pooled client can die between checkouts (Postgres restart, idle
   * termination). `pg` emits that on the pool, and an unhandled 'error' event
   * takes the whole process down. Log and let the pool discard the client.
   */
  pool.on("error", (error) => {
    console.error("[auth/db] idle client error", error);
  });

  globalForPool.authPool = pool;
  return pool;
}
