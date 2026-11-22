/**
 * The contract of `POST /api/v1/feedback`: the public feedback form. Open to
 * anyone; a signed-in sender is attributed. Imports nothing (see
 * `src/shared/README.md`).
 *
 *   200  FeedbackReceipt   received (bots get the same answer, see below)
 *   400  { error }         no category, or a message too short or too long
 *   415  { error }         not sent as JSON
 *   429  { error }         too many at once — this sender, or everyone (the database's flood guard)
 */

export const FEEDBACK_API_PATH = "/api/v1/feedback";

/**
 * What feedback can be about. The same list is the form's options (with their
 * labels, `frontend/modules/feedback/config/feedback-categories.ts`), the API's check, and the
 * database's `CHECK` in `db/supabase/011_feedback.sql`: the UI offers, the
 * server verifies, the database enforces.
 */
export const FEEDBACK_CATEGORY_VALUES = ["bug", "listing", "feature", "praise", "other"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORY_VALUES)[number];

/** The message's length once trimmed — the database checks the same bounds. */
export const FEEDBACK_MESSAGE_MIN = 10;
export const FEEDBACK_MESSAGE_MAX = 4000;

export function isFeedbackCategory(value: unknown): value is FeedbackCategory {
  return typeof value === "string" && (FEEDBACK_CATEGORY_VALUES as readonly string[]).includes(value);
}

export interface FeedbackRequest {
  category: FeedbackCategory;
  message: string;
  /** Only so a reply is possible. An address without a plausible shape is dropped, not refused. */
  email?: string;
  /** The page the form was sent from. */
  pagePath?: string;
  /**
   * Honeypot: a hidden field a person leaves empty and most bots fill. A
   * filled one is answered like any other submission and never stored.
   */
  website?: string;
  /** When the form was opened (ms since epoch). Sent in under three seconds means not by a person. */
  openedAt?: number;
}

/** The answer to a submission — the same whether it was stored or quietly dropped as a bot's. */
export interface FeedbackReceipt {
  received: true;
}
