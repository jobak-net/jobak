import { getAccountModule } from "@/backend/modules/account";
import { UnauthorizedError } from "@/backend/shared/exceptions";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { AccountStatus } from "@/shared/contracts/account";

/**
 * GET /api/v1/me
 *
 * The signed-in viewer and whether they've finished onboarding. Contract:
 * `@/shared/contracts/account` — 200 signed in, 401 signed out, 503 couldn't
 * tell. With auth disabled this is always the local owner.
 *
 * No `auth` option: the account module does the lookup itself, keeping
 * "nobody is signed in" (null → 401) apart from "couldn't find out" (thrown →
 * 503 by the error handler).
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares({ label: "me" }, async (): Promise<AccountStatus> => {
  const status = await getAccountModule().status.execute();
  if (!status) throw new UnauthorizedError();
  return status;
});
