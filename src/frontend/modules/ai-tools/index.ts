/**
 * The AI tools, one slice each (`<tool>/api`, `components`, `hooks`, `lib`,
 * `views`), with what they share in `shared/` (the lock, the provider popup,
 * the tool layout). Each page is locked behind `AiToolGate` until the user
 * saves an AI key (`loadAiAccess` and each tool's page loader in `./server`).
 *
 * Live: cover letter (docs/ai-tools/COVER_LETTER.md), CV review
 * (docs/ai-tools/CV_REVIEW.md), CV tailoring (docs/ai-tools/CV_TAILOR.md),
 * email to HR (docs/ai-tools/HR_EMAIL.md).
 * Still a preview on sample data: interview prep.
 */
export { AiToolGate } from "./shared/components/ai-tool-gate";
export { CoverLetterView } from "./cover-letter/views/cover-letter-view";
export { CvReviewView } from "./cv-review/views/cv-review-view";
export { CvTailorView } from "./cv-tailor/views/cv-tailor-view";
export { HrEmailView } from "./hr-email/views/hr-email-view";
export { InterviewPrepView } from "./interview-prep/views/interview-prep-view";
export { LiveKitSettingsPanel } from "./interview-prep/components/livekit-settings-panel";
export { useLiveKitSettings } from "./interview-prep/hooks/use-livekit-settings";
