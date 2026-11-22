import { clientFetch, unwrap } from "@/frontend/shared/api";
import { FEEDBACK_API_PATH, type FeedbackReceipt, type FeedbackRequest } from "@/shared/contracts/feedback";

/*************** Mutations ***************/

/**
 * Sends the feedback form: `POST /api/v1/feedback`. Works signed in or not.
 *
 * Resolves once it's received; throws an `ApiError` otherwise — `rate-limited`
 * when this sender (or everyone) has sent too many just now.
 */
export async function sendFeedback(input: FeedbackRequest): Promise<FeedbackReceipt> {
    return unwrap(await clientFetch<FeedbackReceipt>(FEEDBACK_API_PATH, { method: "POST", body: input }));
}
