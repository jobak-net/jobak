import "server-only";

import { queryOne } from "@/backend/shared/database";
import { NotFoundError } from "@/backend/shared/exceptions";

import type { BookmarkRepository } from "../domain/bookmark.repository";

/** Postgres' `foreign_key_violation`: here, a `job_id` with no row in `jobs`. */
const FOREIGN_KEY_VIOLATION = "23503";

/**
 * Bookmarks live on `user_job_matches.is_bookmarked`, over the app's Postgres
 * connection.
 *
 * Upsert, not update: the dashboard also lists pool jobs the matcher hasn't
 * scored yet, and those have no match row. An update would report success
 * while changing nothing, and the star would spring back on reload.
 */
export class PgBookmarkRepository implements BookmarkRepository {
    async set(userId: string, jobId: string, bookmarked: boolean): Promise<boolean> {
        try {
            const row = await queryOne<{ is_bookmarked: boolean }>(
                `INSERT INTO user_job_matches (user_id, job_id, is_bookmarked)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (user_id, job_id) DO UPDATE SET is_bookmarked = EXCLUDED.is_bookmarked
                 RETURNING is_bookmarked`,
                [userId, jobId, bookmarked],
            );
            return row?.is_bookmarked ?? bookmarked;
        } catch (error) {
            if ((error as { code?: string }).code === FOREIGN_KEY_VIOLATION) throw new NotFoundError("No such job");
            throw error;
        }
    }
}
