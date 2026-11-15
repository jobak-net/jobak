import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { AiSetupFlow } from "@/frontend/components/onboarding/ai/orchestrator/ai-setup-flow";
import { resolveOnboardingAccess } from "@/frontend/lib/api/guards/onboarding-access";
import { loadAiSetup } from "@/frontend/lib/api/loaders/onboarding";

/**
 * /onboarding/ai — the second onboarding: connecting the AI. Comes after the
 * job questions, so anyone who hasn't answered them is sent back (see the
 * guard). Once connecting is real, a connected user will be sent on to the
 * dashboard from here — part of the backend still to build.
 */
export default async function AiSetupPage() {
  const access = await resolveOnboardingAccess("ai-setup");
  if (access.kind === "load-failed") return <LoadFailed />;

  return <AiSetupFlow {...await loadAiSetup(access.user)} />;
}
