import "server-only";

import type { PoolClient, QueryResultRow } from "pg";

import { getPool } from "./connection";

/**
 * Thin query helpers over the pool.
 *
 * Separated from `./connection` because they change for different reasons: the
 * connection file is about TLS, pool sizing and lifecycle, while these are the
 * shapes every repository calls. Repositories import from here and never touch
 * the pool directly.
 */

/**
 * Runs a query and returns the rows.
 *
 * Parameters are always sent separately from the SQL — `pg` binds them
 * server-side, so values never become part of the statement text. Every call
 * site must use `$1`-style placeholders; interpolating a value into the string
 * is how injection happens.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as unknown[]);
  return result.rows;
}

/** The single row, or null. Throws if the query returned more than one. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);

  if (rows.length > 1) {
    // Always a bug in the caller's SQL, and one that silently returning rows[0]
    // would hide — the wrong user could be returned from a lookup meant to be
    // unique.
    throw new Error(`Expected at most one row, got ${rows.length}`);
  }

  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a transaction on a single client, committing on return and
 * rolling back on throw.
 *
 * Needed wherever two writes must both happen or neither: session rotation is
 * the motivating case — revoking the old row and inserting its replacement
 * cannot be allowed to half-succeed.
 *
 * The callback gets the client, and must use it rather than the module-level
 * `query` helpers; those check out a different connection, which would run
 * outside this transaction and quietly defeat the point.
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    /*
     * A failed ROLLBACK must not replace the original error — that one explains
     * what actually went wrong, while this is usually just "connection already
     * gone". Swallow it and let the real error propagate.
     */
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[auth/db] rollback failed", rollbackError);
    }
    throw error;
  } finally {
    // Back to the pool, never closed. Missing this exhausts the pool after
    // `max` requests and every later query waits forever.
    client.release();
  }
}
