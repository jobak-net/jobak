import "server-only";

import { SubmitFeedbackUseCase } from "./application/submit-feedback.use-case";
import { PgFeedbackRepository } from "./infrastructure/pg-feedback.repository";

/**
 * The feedback module's composition root. Cached per process, versioned so a
 * running dev server rebuilds it when its shape changes.
 */
export interface FeedbackModule {
    /** Takes a submission from the public form — `POST /api/v1/feedback`. */
    submit: SubmitFeedbackUseCase;
}

const VERSION = 2;

const globalForFeedback = globalThis as unknown as {
    feedbackModule?: FeedbackModule;
    feedbackModuleVersion?: number;
};

export function getFeedbackModule(): FeedbackModule {
    if (!globalForFeedback.feedbackModule || globalForFeedback.feedbackModuleVersion !== VERSION) {
        globalForFeedback.feedbackModule = { submit: new SubmitFeedbackUseCase(new PgFeedbackRepository()) };
        globalForFeedback.feedbackModuleVersion = VERSION;
    }
    return globalForFeedback.feedbackModule;
}
