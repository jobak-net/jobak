import { redirect } from "next/navigation";

import { requireUser } from "@/backend/modules/auth/interface";
import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";
import { getPreferencesModule } from "@/backend/modules/preferences";
import { LoadFailed } from "@/frontend/components/dashboard/load-failed";
import { OnboardingFlow } from "@/frontend/components/onboarding/onboarding-flow";
import { AI_SETUP_HREF } from "@/frontend/lib/configs/cta";

import { readOnboardingStatus } from "../_lib/onboarding-status";

/**
 * /onboarding — the first-time setup.
 *
 * Loads the job fields (each with a few suggested titles — the full catalogue
 * is reached through search) and any preferences already saved, so returning
 * here prefills the answers instead of starting over.
 *
 * The questions are asked once: someone who has answered them moves on to
 * connecting their AI (which sends them to the dashboard if that's done too).
 */
export default async function OnboardingPage() {
  const user = await requireUser();

  const answered = await readOnboardingStatus(user.id);
  if (answered === null) return <LoadFailed />;
  if (answered) redirect(AI_SETUP_HREF);

  const [catalogue, saved] = await Promise.all([
    getJobCatalogueModule()
      .listFields.execute()
      // Without fields the step still works: search needs none of this.
      .catch((error) => {
        console.error("[onboarding] could not load job fields", error);
        return [];
      }),
    getPreferencesModule()
      .get.execute(user.id)
      // Unreadable preferences are not a reason to block onboarding: it opens empty.
      .catch((error) => {
        console.error("[onboarding] could not load saved preferences", error);
        return null;
      }),
  ]);

  return (
    <OnboardingFlow
      catalogue={catalogue}
      initial={saved ?? undefined}
      firstName={user.fullName?.split(/\s+/)[0] ?? null}
    />
  );
}
