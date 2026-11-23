/**
 * Server entry point for the applicant module: the name and CVs a user
 * applies with (`user_preferences.applicant_name`, `user_cvs`, migration 025).
 * Guide: docs/ai-tools/CV_REVIEW.md ("Saved CVs and name").
 */
export { getApplicantModule, type ApplicantModule } from "./composition";
