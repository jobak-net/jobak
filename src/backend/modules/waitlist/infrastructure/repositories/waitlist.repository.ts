import "server-only";

import { query } from "@/backend/modules/auth/infrastructure/database";

import type {
  WaitlistEntry,
  WaitlistSignup,
  WorkPreference,
} from "../../domain/entities/waitlist-entry.entity";
import type { WaitlistRepository } from "../../domain/ports/waitlist.repository";

/**
 * Postgres-backed waitlist.
 *
 * Borrows the auth module's connection pool rather than opening a second one.
 * That is a pragmatic coupling — one pool per process is the right shape for
 * serverless, and the alternative doubles the connection count for no gain. The
 * dependency is on the pool alone, not on anything auth decides.
 */

interface WaitlistRow {
  id: string;
  email: string;
  field: string | null;
  job_titles: string[] | null;
  countries: string[] | null;
  work_preference: string[] | null;
  source: string | null;
  referrer: string | null;
  invited_at: Date | null;
  created_at: Date;
}

const toEntry = (row: WaitlistRow): WaitlistEntry => ({
  id: row.id,
  email: row.email,
  field: row.field,
  jobTitles: row.job_titles ?? [],
  countries: row.countries ?? [],
  workPreference: (row.work_preference ?? []) as WorkPreference[],
  source: row.source,
  referrer: row.referrer,
  invitedAt: row.invited_at,
  createdAt: row.created_at,
});

const COLUMNS =
  "id, email, field, job_titles, countries, work_preference, source, referrer, invited_at, created_at";

export class PgWaitlistRepository implements WaitlistRepository {
  async add(signup: WaitlistSignup): Promise<{ created: boolean }> {
    /*
     * One statement, so two simultaneous submissions of the same address cannot
     * both insert.
     *
     * ── Why the conflict branch merges rather than does nothing ─────────────
     * The sign-up form is two steps: the address first, then optional
     * preferences that are sent as a second request for the same email. With
     * `DO NOTHING` that second request would be silently discarded and the
     * preferences never stored.
     *
     * So each column takes the new value only when one was actually supplied —
     * `COALESCE` for the scalars, a length check for the arrays. Re-submitting
     * with an empty form therefore fills nothing in and wipes nothing out,
     * which is the property `DO NOTHING` was reaching for.
     *
     * `xmax = 0` is the standard way to tell an insert from an update in
     * `RETURNING`: it is zero only for a freshly inserted row.
     */
    const rows = await query<{ id: string; inserted: boolean }>(
      `INSERT INTO waitlist (email, field, job_titles, countries, work_preference, source, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         field           = COALESCE(EXCLUDED.field, waitlist.field),
         job_titles      = CASE WHEN array_length(EXCLUDED.job_titles, 1) > 0
                                THEN EXCLUDED.job_titles ELSE waitlist.job_titles END,
         countries       = CASE WHEN array_length(EXCLUDED.countries, 1) > 0
                                THEN EXCLUDED.countries ELSE waitlist.countries END,
         work_preference = CASE WHEN array_length(EXCLUDED.work_preference, 1) > 0
                                THEN EXCLUDED.work_preference ELSE waitlist.work_preference END,
         source          = COALESCE(waitlist.source, EXCLUDED.source),
         referrer        = COALESCE(waitlist.referrer, EXCLUDED.referrer)
       RETURNING id, (xmax = 0) AS inserted`,
      [
        signup.email,
        signup.field,
        signup.jobTitles,
        signup.countries,
        signup.workPreference,
        signup.source,
        signup.referrer,
      ],
    );

    return { created: rows[0]?.inserted === true };
  }

  async count(): Promise<number> {
    const rows = await query<{ n: string }>(
      `SELECT count(*)::text AS n FROM waitlist`,
    );
    // count() comes back as a string from `::text` — bigint would otherwise
    // arrive as a string anyway, so the cast makes the parse explicit.
    return Number(rows[0]?.n ?? 0);
  }

  async pending(limit: number): Promise<WaitlistEntry[]> {
    const rows = await query<WaitlistRow>(
      `SELECT ${COLUMNS} FROM waitlist
        WHERE invited_at IS NULL
        ORDER BY created_at
        LIMIT $1`,
      [limit],
    );
    return rows.map(toEntry);
  }
}
