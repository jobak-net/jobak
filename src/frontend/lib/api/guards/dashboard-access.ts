import "server-only";

import { redirect } from "next/navigation";

import { serverFetch } from "@/frontend/lib/api/server-fetch";
import { ACCOUNT_API_PATH, type AccountStatus } from "@/shared/contracts/account";
import { ONBOARDING_HREF, SIGN_IN_HREF } from "@/shared/routes";

export type DashboardAccess =
  | { kind: "ready"; user: AccountStatus["user"] }
  /** We couldn't find out — the database, typically. Show the retry screen. */
  | { kind: "load-failed" };

/**
 * Whether this request may see the dashboard, decided before anything renders.
 * The facts come from the backend (`GET /api/v1/me`); what to do with them is
 * decided here.
 *
 *  - Signed out: redirected to sign in. (With auth disabled there is always a
 *    user, the local owner.)
 *  - Not finished onboarding — a new account, or the local owner on a fresh
 *    install: redirected to /onboarding, because the dashboard has nothing to
 *    show without a search to run.
 *  - The backend couldn't tell: `load-failed`, never a redirect on a guess.
 *    A guess is how the dashboard and the onboarding pages end up bouncing
 *    someone between them.
 *
 * This is a convenience, not the security gate: each page still checks the
 * user itself and only shows that user's own data.
 */
export async function resolveDashboardAccess(): Promise<DashboardAccess> {
  const result = await serverFetch<AccountStatus>(ACCOUNT_API_PATH);

  if (result.kind === "failed") return { kind: "load-failed" };
  if (result.kind === "unauthorized") redirect(SIGN_IN_HREF);
  if (!result.data.onboarded) redirect(ONBOARDING_HREF);

  return { kind: "ready", user: result.data.user };
}
