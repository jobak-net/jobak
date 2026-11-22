import { revalidatePath } from "next/cache";

import { getPreferencesModule } from "@/backend/modules/preferences";
import { jobPreferenceSchema } from "@/backend/modules/preferences/validation/job-preference-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { SaveOnboardingResponse } from "@/shared/contracts/onboarding";

/**
 * POST /api/v1/onboarding
 *
 * Finishes onboarding: saves the answers and marks it complete. Contract:
 * `@/shared/contracts/onboarding`.
 *
 * The body is checked for shape by the schema, then the use case applies the
 * search rules and re-runs every step's rules; a refusal names the step to go
 * back to. The user id comes from the session, never the body.
 */
export const dynamic = "force-dynamic";

export const POST = withMiddlewares(
  { label: "onboarding.complete", auth: "required", body: jobPreferenceSchema },
  async ({ user, body }): Promise<SaveOnboardingResponse> => {
    const result = await getPreferencesModule().completeOnboarding.execute(user.id, body);
    // The dashboard reads these preferences (matches, the getting-started strip).
    if (result.ok) revalidatePath("/dashboard", "layout");
    return result;
  },
);
