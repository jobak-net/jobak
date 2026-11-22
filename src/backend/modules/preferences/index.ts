/**
 * Server entry point for the preferences module.
 *
 * Server-only. The rules the browser also runs (search rules, onboarding
 * steps) live in `@/shared/preferences` and `@/shared/onboarding`.
 */
export { getPreferencesModule, type PreferencesModule } from "./composition";
export type { SaveResult } from "./application/save-preferences.use-cases";
export type { JobPreferences, StoredPreferences, WorkMode, JobType, Seniority } from "./domain/job-preferences";
