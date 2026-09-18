import "server-only";

import { cache } from "react";

import { query } from "@/backend/modules/auth/infrastructure/database";

/**
 * Whether a user has finished onboarding.
 *
 * Deliberately outside the auth module: `onboarding_completed` lives on
 * `user_preferences`, which belongs to onboarding, not to identity. Auth
 * answers "who is this"; this answers "how far through setup are they", and
 * conflating the two is how a module stops having a boundary.
 *
 * It borrows auth's connection pool rather than opening a second one — that is
 * a pragmatic shortcut until the preferences module has its own repository, and
 * the only coupling is to the pool, not to auth's logic.
 *
 * ── Why this exists at all ──────────────────────────────────
 * The proxy used to answer this with up to three queries per request, including
 * on every link prefetch. Moving it here means it runs once per real
 * navigation, and `cache` collapses repeat asks within a single render.
 */
export const hasCompletedOnboarding = cache(
  async (userId: string): Promise<boolean> => {
    try {
      const rows = await query<{ onboarding_completed: boolean | null }>(
        `SELECT onboarding_completed FROM user_preferences WHERE user_id = $1`,
        [userId],
      );

      return rows[0]?.onboarding_completed === true;
    } catch (error) {
      /*
       * Fails closed, to "not onboarded".
       *
       * The two failure modes are not symmetrical: treating an error as
       * "onboarded" drops someone into a dashboard with no preferences, where
       * every panel is empty and nothing explains why. Sending them to
       * onboarding shows a form they can fill in — and if they had already
       * completed it, the form is prefilled from the same row, so the worst case
       * is a page they did not ask for rather than a broken one.
       */
      console.error("[onboarding-status] lookup failed", error);
      return false;
    }
  },
);
