import "server-only";

import { Pool } from "pg";

import { resolveSslConfig } from "./ssl";

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
 * Query helpers live in `./client` and TLS rules in `./ssl`; this file is only
 * about getting and configuring the pool.
 */

/**
 * Cached on `globalThis` because Next's dev server re-evaluates modules on
 * every hot reload. A module-level `new Pool()` would therefore leak a fresh
 * pool per edit until Postgres refuses new connections — the classic dev-only
 * "too many clients already" failure, which never reproduces in production and
 * so tends to get misdiagnosed.
 *
 * Keyed by the connection string: `next dev` reloads `.env` in the same
 * process when it is edited, and a pool cached against the old URL would keep
 * using it (switching to the transaction pooler's port, say, would silently do
 * nothing until a restart). On a change the old pool is closed and replaced.
 */
const globalForPool = globalThis as unknown as { pool?: Pool; poolUrl?: string };

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

export function getPool(): Pool {
  const url = connectionString();
  if (globalForPool.pool && globalForPool.poolUrl === url) return globalForPool.pool;

  // The URL changed under a running dev server: retire the old pool's connections.
  if (globalForPool.pool) {
    const stale = globalForPool.pool;
    void stale.end().catch((error) => console.error("[db] closing stale pool failed", error));
  }

  const pool = new Pool({
    connectionString: url,
    // See ./ssl — shared with the migration script.
    ssl: resolveSslConfig(url),

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
    console.error("[db] idle client error", error);
  });

  globalForPool.pool = pool;
  globalForPool.poolUrl = url;
  return pool;
}
