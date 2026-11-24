import { LoadFailed } from "@/frontend/shared/components";
import { OnboardingFlow } from "@/frontend/modules/onboarding";
import { resolveOnboardingAccess, loadOnboardingQuestions } from "@/frontend/modules/onboarding/server";

/**
 * /onboarding — the first-time setup: the job questions, prefilled with any
 * answers already saved. Asked once: someone who has answered them is sent on
 * to connecting their AI (see the guard).
 */
export default async function OnboardingPage() {
  const access = await resolveOnboardingAccess("questions");
  if (access.kind === "load-failed") return <LoadFailed />;

  return <OnboardingFlow {...await loadOnboardingQuestions(access.user)} />;
}
