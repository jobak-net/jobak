import { NextResponse } from "next/server";

import { getAccountModule } from "@/backend/modules/account";
import type { AccountStatus } from "@/shared/contracts/account";

/**
 * GET /api/v1/me
 *
 * The signed-in viewer and whether they've finished onboarding. Status codes
 * and body are the contract in `@/shared/contracts/account` — in short: 200
 * signed in, 401 signed out, 503 couldn't tell.
 *
 * With auth disabled this is always the local owner.
 */
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  let status: AccountStatus | null;
  try {
    status = await getAccountModule().status.execute();
  } catch (error) {
    console.error("[api/me] could not load the account", error);
    return NextResponse.json({ error: "Could not load the account" }, { status: 503, headers: noStore });
  }

  if (!status) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStore });
  }
  return NextResponse.json(status, { headers: noStore });
}
