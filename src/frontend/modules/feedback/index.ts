/**
 * The feedback module's public API — the only file other code may import from
 * `@/frontend/modules/feedback`. Everything else in this folder is internal.
 *
 *     api/         sendFeedback (POST /api/v1/feedback) and useSendFeedback
 *     components/  the form and its regions
 *     hooks/       useFeedbackForm: the form's state and sending
 *     config/      the category options' wording
 *     views/       FeedbackView: the page's content
 */
export { FeedbackView } from "./views/feedback-view";
