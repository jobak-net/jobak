import type { JobPreferences } from "@/backend/modules/preferences/domain/job-preferences";

/**
 * What this module needs from preferences: a user's saved answers. A port, so
 * this module never imports that one's internals; the preferences module
 * answers it (see `composition.ts`).
 */
export interface PreferencesReader {
    get(userId: string): Promise<JobPreferences | null>;
}
