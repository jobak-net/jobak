import { NextResponse } from "next/server";

import { requireApiUser } from "@/backend/modules/auth/interface";
import { getJobSearchModule } from "@/backend/modules/job-search";
import type { Job } from "@/shared/contracts/jobs";

/**
 * GET /api/v1/jobs
 *
 * The jobs worth showing the signed-in user, best matches first. Status codes
 * and body are the contract in `@/shared/contracts/jobs` — in short: 200 with
 * `Job[]` (empty until they have preferences), 401 signed out, 503 couldn't
 * read them.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  let jobs: Job[];
  try {
    jobs = await getJobSearchModule().listUserJobs.execute(user.id);
  } catch (error) {
    console.error("[api/jobs] could not list the user's jobs", error);
    return NextResponse.json({ error: "Could not load jobs" }, { status: 503, headers: noStore });
  }

  return NextResponse.json(jobs, { headers: noStore });
}
