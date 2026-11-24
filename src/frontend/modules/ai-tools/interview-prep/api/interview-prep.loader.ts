import "server-only";

import { requireDashboardUser } from "@/frontend/modules/dashboard/server";

/**
 * The only Jobak data interview practice needs: the account id (keys the
 * LiveKit setup kept in the browser) and the name the interviewer uses.
 * The call itself happens between the browser and the user's LiveKit.
 */
export async function loadInterviewPrepPage(): Promise<{ accountId: string; candidateName: string | null }> {
  const user = await requireDashboardUser();
  return { accountId: user.id, candidateName: user.fullName };
}
