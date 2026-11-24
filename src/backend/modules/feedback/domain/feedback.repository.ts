import type { NewFeedback } from "./feedback";

/** Where feedback is kept. A port, so the use case never names the table. */
export interface FeedbackRepository {
    /**
     * Stores a submission. Throws `TooManyRequestsError` when the database's
     * flood guard refuses it (too many from everyone in the last minute).
     */
    add(entry: NewFeedback): Promise<void>;
}
