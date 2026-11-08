import "server-only";

import { unstable_rethrow } from "next/navigation";

import { hasCompletedOnboarding } from "@/backend/modules/preferences";

/**
 * Whether the user has answered the job questions — or null when the
 * database couldn't say.
 *
 * Each onboarding page redirects on this (the questions send finished users
 * on; the AI step sends unfinished ones back), and on null shows the retry
 * screen instead: redirecting on a guess is how two gates bounce a user
 * between them. Cached per request by `hasCompletedOnboarding`.
 */
export async function readOnboardingStatus(userId: string): Promise<boolean | null> {
    try {
        return await hasCompletedOnboarding(userId);
    } catch (error) {
        unstable_rethrow(error);
        console.error("[onboarding] could not read onboarding status", error);
        return null;
    }
}
