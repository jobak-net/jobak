import type { FeedbackCategory } from "@/shared/contracts/feedback";

/** A submission as it is stored. */
export interface NewFeedback {
    category: FeedbackCategory;
    /** Already trimmed and within bounds (`feedbackSchema`). */
    message: string;
    email: string | null;
    pagePath: string | null;
    /** The signed-in sender, or null — never an id the browser sent. */
    userId: string | null;
}

/** The database's limit on `feedback.page_path`. */
const PAGE_PATH_MAX = 300;

/**
 * A plausible address, or nothing.
 *
 * Deliberately loose: the field is optional and exists only so a reply is
 * possible. Refusing a valid-but-unusual address would cost a bug report to
 * satisfy a regex, so anything with a shape is kept and anything without is
 * dropped rather than refused.
 */
export function cleanEmail(value: string | undefined): string | null {
    const raw = (value ?? "").trim();
    if (!raw || raw.length > 200) return null;
    return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(raw) ? raw : null;
}

/** The page it was sent from, cut to what the column holds. */
export function cleanPagePath(value: string | undefined): string | null {
    return (value ?? "").slice(0, PAGE_PATH_MAX) || null;
}
