import { NextResponse } from "next/server";

import { requireApiUser } from "@/backend/modules/auth/interface";
import { getPreferencesModule } from "@/backend/modules/preferences";
import type { JobPreferences, SavedPreferencesResponse } from "@/shared/contracts/preferences";

/**
 * GET /api/v1/preferences
 *
 * The signed-in user's saved search preferences, or `null` until they've saved
 * any. Contract: `@/shared/contracts/preferences` — 200, 401 signed out, 503
 * couldn't read them.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  let preferences: JobPreferences | null;
  try {
    const stored = await getPreferencesModule().get.execute(user.id);
    // Only the contract's fields: `onboardingCompleted` is `GET /api/v1/me`'s to answer.
    preferences = stored && {
      location: stored.location,
      workModes: stored.workModes,
      jobTitles: stored.jobTitles,
      keywords: stored.keywords,
      jobTypes: stored.jobTypes,
      seniority: stored.seniority,
      field: stored.field,
    };
  } catch (error) {
    console.error("[api/preferences] could not read preferences", error);
    return NextResponse.json({ error: "Could not load preferences" }, { status: 503, headers: noStore });
  }

  return NextResponse.json({ preferences } satisfies SavedPreferencesResponse, { headers: noStore });
}
