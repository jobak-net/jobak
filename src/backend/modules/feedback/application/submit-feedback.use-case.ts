import { TooManyRequestsError } from "@/backend/shared/exceptions";
import type { FeedbackReceipt, FeedbackRequest } from "@/shared/contracts/feedback";

import { cleanEmail, cleanPagePath } from "../domain/feedback";
import type { FeedbackRepository } from "../domain/feedback.repository";

export interface FeedbackSubmission {
    /** The body, already validated (`feedbackSchema`). */
    input: FeedbackRequest;
    /** The signed-in sender, or null: feedback can be anonymous. */
    userId: string | null;
    /** The forwarded address, to key the limit for anonymous senders. */
    clientIp: string | null;
}

/** A person can't read the page, pick a category and write a sentence faster than this. */
const MIN_FILL_MS = 3_000;

/** One submission per sender per this long. */
const MIN_INTERVAL_MS = 20_000;

/** Above this many senders remembered, forget the ones whose wait is over. */
const PRUNE_AT = 1_000;

const RECEIVED: FeedbackReceipt = { received: true };

/**
 * Takes a submission from the public feedback form — `POST /api/v1/feedback`.
 *
 * Three guards, cheapest first:
 *  1. **Bots** — a filled honeypot, or a form sent within three seconds of
 *     opening, is answered "received" and never stored. Telling a bot it was
 *     caught only helps it.
 *  2. **This sender** — one per 20 s, keyed by the signed-in user or else the
 *     forwarded IP. In memory, so per instance and reset on deploy: enough for
 *     a held-down button or a stuck retry, not the real defence.
 *  3. **Everyone** — the database's `feedback_flood` trigger (011_feedback.sql)
 *     holds wherever the request lands; the repository turns it into a 429.
 */
export class SubmitFeedbackUseCase {
    /** Sender key → when their last submission was stored. */
    private readonly lastSubmission = new Map<string, number>();

    constructor(
        private readonly feedback: FeedbackRepository,
        private readonly now: () => number = Date.now,
    ) {}

    async execute({ input, userId, clientIp }: FeedbackSubmission): Promise<FeedbackReceipt> {
        const now = this.now();

        if (input.website?.trim()) return RECEIVED;
        if (input.openedAt !== undefined && Number.isFinite(input.openedAt) && now - input.openedAt < MIN_FILL_MS) {
            return RECEIVED;
        }

        const key = userId ?? clientIp ?? "anonymous";
        if (now - (this.lastSubmission.get(key) ?? 0) < MIN_INTERVAL_MS) {
            throw new TooManyRequestsError("One submission per sender every 20 seconds");
        }

        await this.feedback.add({
            category: input.category,
            message: input.message,
            email: cleanEmail(input.email),
            pagePath: cleanPagePath(input.pagePath),
            userId,
        });

        this.remember(key, now);
        return RECEIVED;
    }

    private remember(key: string, now: number) {
        if (this.lastSubmission.size >= PRUNE_AT) {
            for (const [k, at] of this.lastSubmission) if (now - at >= MIN_INTERVAL_MS) this.lastSubmission.delete(k);
        }
        this.lastSubmission.set(key, now);
    }
}
