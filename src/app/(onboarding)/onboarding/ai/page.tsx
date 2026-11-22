import { LoadFailed } from "@/frontend/shared/components";
import { AiSetupFlow } from "@/frontend/modules/onboarding";
import { resolveOnboardingAccess, loadAiSetup } from "@/frontend/modules/onboarding/server";

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
