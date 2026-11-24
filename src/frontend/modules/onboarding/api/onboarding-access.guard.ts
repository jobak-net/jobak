import "server-only";

import { redirect } from "next/navigation";

import { serverFetch } from "@/frontend/shared/api/server";
import { ACCOUNT_API_PATH, type AccountStatus } from "@/shared/contracts/account";
import { AI_SETTINGS_API_PATH, type AiSettingsResponse } from "@/shared/contracts/ai-settings";
import { AI_SETUP_HREF, DASHBOARD_HREF, ONBOARDING_HREF, SIGN_IN_HREF } from "@/shared/routes";

/** The two onboarding pages, in order. */
export type OnboardingStep = "questions" | "ai-setup";

export type OnboardingAccess =
  | { kind: "ready"; user: AccountStatus["user"] }
  /** We couldn't find out — the database, typically. Show the retry screen. */
  | { kind: "load-failed" };

/**
 * Whether this request belongs on the given onboarding step, decided before
 * the page renders. The facts come from the backend (`GET /api/v1/me`).
 *
 *  - Signed out: redirected to sign in. (With auth disabled there is always a
 *    user, the local owner.)
 *  - On the questions with the questions already answered: sent on to the AI
 *    step, so they're asked once.
 *  - On the AI step without having answered the questions: sent back to them.
 *  - On the AI step with an AI already connected (`GET /api/v1/ai-settings`):
 *    sent on to the dashboard. Changing it is Settings' job. If that read
 *    fails, the step is shown: connecting again is harmless.
 *  - The backend couldn't tell: `load-failed`, never a redirect on a guess.
 *    The two steps — and the dashboard — redirect in opposite directions, so
 *    guessing is how someone ends up bounced between them.
 */
export async function resolveOnboardingAccess(step: OnboardingStep): Promise<OnboardingAccess> {
  const result = await serverFetch<AccountStatus>(ACCOUNT_API_PATH);

  if (result.kind === "failed") return { kind: "load-failed" };
  if (result.kind === "unauthorized") redirect(SIGN_IN_HREF);

  const { onboarded } = result.data;
  if (step === "questions" && onboarded) redirect(AI_SETUP_HREF);
  if (step === "ai-setup" && !onboarded) redirect(ONBOARDING_HREF);
  if (step === "ai-setup") {
    const ai = await serverFetch<AiSettingsResponse>(AI_SETTINGS_API_PATH);
    if (ai.kind === "ok" && ai.data.connected.length > 0) redirect(DASHBOARD_HREF);
  }

  return { kind: "ready", user: result.data.user };
}
