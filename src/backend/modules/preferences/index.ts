/**
 * Server entry point for the preferences module.
 *
 * The browser imports the pure parts directly — `domain/job-preferences` and
 * `domain/onboarding` — never this file, which pulls in the database.
 */
export { getPreferencesModule, type PreferencesModule } from "./composition";
export { hasCompletedOnboarding } from "./interface/onboarding-status";
export type { SaveResult } from "./application/save-preferences.use-cases";
export type { JobPreferences, StoredPreferences, WorkMode, JobType, Seniority } from "./domain/job-preferences";
