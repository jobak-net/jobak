/**
 * The AI tools, one slice each (`<tool>/api`, `components`, `hooks`, `lib`,
 * `views`), with what they share in `shared/` (the lock, the provider popup,
 * the tool layout). Each page is locked behind `AiToolGate` until the user
 * saves an AI key (`loadAiAccess` / `loadCoverLetterPage` / `loadCvReviewPage` in `./server`).
 *
 * Live: cover letter (docs/ai-tools/COVER_LETTER.md), CV review
 * (docs/ai-tools/CV_REVIEW.md). Still previews on sample data: CV tailoring,
 * interview prep.
 */
export { AiToolGate } from "./shared/components/ai-tool-gate";
export { CoverLetterView } from "./cover-letter/views/cover-letter-view";
export { CvReviewView } from "./cv-review/views/cv-review-view";
export { CvTailorView } from "./cv-tailor/views/cv-tailor-view";
export { InterviewPrepView } from "./interview-prep/views/interview-prep-view";
