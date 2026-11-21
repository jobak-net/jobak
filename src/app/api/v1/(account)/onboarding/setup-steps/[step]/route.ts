import { z } from "zod";

import { getJobSearchModule } from "@/backend/modules/job-search";
import { NotFoundError } from "@/backend/shared/exceptions";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import { isSetupStepId, type SetupStepResult } from "@/shared/contracts/setup-steps";

/**
 * GET /api/v1/onboarding/setup-steps/[step]
 *
 * Runs one step of the setup screen shown before connecting the AI —
 * `preferences`, `search` or `sources` — and returns its numbers. Contract:
 * `@/shared/contracts/setup-steps`.
 *
 * Only the step name comes from the URL; whose preferences and which filters
 * come from the session and the database.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "onboarding.setup-step", auth: "required", params: z.object({ step: z.string() }) },
  async ({ user, params }): Promise<SetupStepResult> => {
    // 404, not 400: an unknown step is a URL that doesn't exist.
    if (!isSetupStepId(params.step)) throw new NotFoundError("Not a setup step");
    return getJobSearchModule().runSetupStep.execute(user.id, params.step);
  },
);
