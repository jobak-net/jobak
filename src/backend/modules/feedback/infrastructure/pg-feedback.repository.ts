import "server-only";

import { query } from "@/backend/shared/database";
import { TooManyRequestsError } from "@/backend/shared/exceptions";

import type { NewFeedback } from "../domain/feedback";
import type { FeedbackRepository } from "../domain/feedback.repository";

/** Postgres' `check_violation`, which the flood trigger raises. */
const CHECK_VIOLATION = "23514";

/**
 * Feedback rows over the app's Postgres connection.
 *
 * `user_id` is the verified sender or null, never anything the browser sent:
 * 014_custom_auth.sql dropped the policy clause that used to pin it, and left
 * that job to the app. `status` is always `new`.
 */
export class PgFeedbackRepository implements FeedbackRepository {
    async add(entry: NewFeedback): Promise<void> {
        try {
            await query(
                `INSERT INTO feedback (category, message, email, page_path, user_id, status)
                 VALUES ($1, $2, $3, $4, $5, 'new')`,
                [entry.category, entry.message, entry.email, entry.pagePath, entry.userId],
            );
        } catch (error) {
            // The flood guard is a "slow down", not a fault. Any other check
            // violation is a real mismatch with the schema and stays an error.
            const { code, message } = error as { code?: string; message?: string };
            if (code === CHECK_VIOLATION && /too many submissions/i.test(message ?? "")) {
                throw new TooManyRequestsError("Database flood guard");
            }
            throw error;
        }
    }
}
