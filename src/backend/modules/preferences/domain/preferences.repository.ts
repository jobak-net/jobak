import type { JobPreferences, StoredPreferences } from "./job-preferences";

/**
 * Persistence for a user's search preferences and onboarding flag.
 *
 * A port, so the onboarding logic (step 2) can be exercised without Postgres,
 * and so nothing outside `infrastructure/` names the table.
 */
export interface PreferencesRepository {
    /**
     * Whether the user has finished onboarding — false when they have no row.
     * Throws when the database can't be read: "unknown" is not "no", and the
     * callers decide where to send someone on it.
     */
    hasCompletedOnboarding(userId: string): Promise<boolean>;

    /** The user's preferences, or null when they have never saved any. */
    findByUserId(userId: string): Promise<StoredPreferences | null>;

    /**
     * Writes the preferences, creating the row if needed.
     *
     * `completeOnboarding` sets the flag; it is never cleared here, so editing
     * preferences later from the dashboard cannot send a user back into
     * onboarding. Input must already have passed `applySearchRules`.
     */
    save(userId: string, preferences: JobPreferences, options: { completeOnboarding: boolean }): Promise<void>;
}
