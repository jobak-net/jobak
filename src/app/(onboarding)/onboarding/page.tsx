import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { OnboardingFlow } from "@/frontend/components/onboarding/questions/orchestrator/onboarding-flow";
import { resolveOnboardingAccess } from "@/frontend/lib/api/guards/onboarding-access";
import { loadOnboardingQuestions } from "@/frontend/lib/api/loaders/onboarding";

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
