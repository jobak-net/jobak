import "server-only";

import { cache } from "react";

import { getPreferencesModule } from "../composition";

/**
 * Whether a user has finished onboarding, asked at most once per request.
 *
 * Both the dashboard layout (not finished → /onboarding) and the onboarding
 * layout (finished → /dashboard) ask, and `cache` collapses repeat asks
 * within one render.
 *
 * It throws when the database can't be read, and the callers show the retry
 * screen instead of redirecting. Guessing either way would be wrong: guessing
 * "not finished" bounces a finished user into onboarding, and if the database
 * then answers there, straight back — a redirect loop on a flaky connection.
 * The old helper failed closed to "not finished" because nothing redirected
 * on it; now that something does, unknown has to stay unknown.
 */
export const hasCompletedOnboarding = cache(
    (userId: string): Promise<boolean> => getPreferencesModule().onboardingStatus.execute(userId),
);
