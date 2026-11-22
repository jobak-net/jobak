import type { FeedbackReceipt, FeedbackRequest } from "@/shared/contracts/feedback";

import { cleanEmail, cleanPagePath } from "../domain/feedback";
import type { FeedbackRepository } from "../domain/feedback.repository";

export interface FeedbackSubmission {
    /** The body, already validated (`feedbackSchema`). */
    input: FeedbackRequest;
    /** The signed-in sender, or null: feedback can be anonymous. */
    userId: string | null;
}

/** A person can't read the page, pick a category and write a sentence faster than this. */
const MIN_FILL_MS = 3_000;

const RECEIVED: FeedbackReceipt = { received: true };

/**
 * Takes a submission from the public feedback form — `POST /api/v1/feedback`.
 *
 * Three guards:
 *  1. **This sender** — the route's `feedback` rate limit (`withMiddlewares`,
 *     `@/backend/shared/rate-limit`), per user or else per address, counted in
 *     Postgres so it holds on every instance. Before this use case runs.
 *  2. **Bots** — a filled honeypot, or a form sent within three seconds of
 *     opening, is answered "received" and never stored. Telling a bot it was
 *     caught only helps it.
 *  3. **Everyone** — the database's `feedback_flood` trigger (011_feedback.sql)
 *     holds wherever the request lands; the repository turns it into a 429.
 */
export class SubmitFeedbackUseCase {
    constructor(
        private readonly feedback: FeedbackRepository,
        private readonly now: () => number = Date.now,
    ) {}

    async execute({ input, userId }: FeedbackSubmission): Promise<FeedbackReceipt> {
        const now = this.now();

        if (input.website?.trim()) return RECEIVED;
        if (input.openedAt !== undefined && Number.isFinite(input.openedAt) && now - input.openedAt < MIN_FILL_MS) {
            return RECEIVED;
        }

        await this.feedback.add({
            category: input.category,
            message: input.message,
            email: cleanEmail(input.email),
            pagePath: cleanPagePath(input.pagePath),
            userId,
        });

        return RECEIVED;
    }
}
