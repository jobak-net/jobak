import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/backend/modules/auth/interface";
import { getPreferencesModule, type SaveResult } from "@/backend/modules/preferences";
import type { SaveOnboardingResponse } from "@/shared/contracts/onboarding";

/**
 * POST /api/v1/onboarding
 *
 * Finishes onboarding: saves the answers and marks it complete. Contract:
 * `@/shared/contracts/onboarding`.
 *
 * The body is untrusted, so it isn't saved as sent — the use case parses it,
 * applies the search rules and re-runs every step's rules, and a refusal names
 * the step to go back to. The user id comes from the session, never the body,
 * so nobody can save someone else's answers.
 *
 * JSON only (415 otherwise): a cross-site form can't send that without a CORS
 * preflight, which this route never approves — so another site can't post to
 * it with the visitor's cookies.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send the answers as JSON" }, { status: 415, headers: noStore });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The body isn't valid JSON" }, { status: 400, headers: noStore });
  }

  let result: SaveResult;
  try {
    result = await getPreferencesModule().completeOnboarding.execute(user.id, body);
  } catch (error) {
    console.error("[api/onboarding] could not save", error);
    return NextResponse.json({ error: "Could not save your answers" }, { status: 503, headers: noStore });
  }

  // The dashboard reads these preferences (matches, the getting-started strip).
  if (result.ok) revalidatePath("/dashboard", "layout");

  return NextResponse.json(result satisfies SaveOnboardingResponse, { headers: noStore });
}
