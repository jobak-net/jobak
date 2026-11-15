import { NextResponse } from "next/server";

import { requireApiUser } from "@/backend/modules/auth/interface";
import { getJobSearchModule } from "@/backend/modules/job-search";
import { isSetupStepId, type SetupStepResult } from "@/shared/contracts/setup-steps";

/**
 * GET /api/v1/onboarding/setup-steps/[step]
 *
 * Runs one step of the setup screen shown before connecting the AI —
 * `preferences`, `search` or `sources` — and returns its numbers. Contract:
 * `@/shared/contracts/setup-steps`.
 *
 * Only the step name comes from the URL, and it's checked against the known
 * steps; whose preferences and which filters come from the session and the
 * database, never from the request.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ step: string }> }) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { step } = await params;
  if (!isSetupStepId(step)) {
    return NextResponse.json({ error: "Not a setup step" }, { status: 404, headers: noStore });
  }

  let result: SetupStepResult;
  try {
    result = await getJobSearchModule().runSetupStep.execute(user.id, step);
  } catch (error) {
    console.error(`[api/onboarding/setup-steps] ${step} failed`, error);
    return NextResponse.json({ error: "Could not run this step" }, { status: 503, headers: noStore });
  }

  return NextResponse.json(result, { headers: noStore });
}
