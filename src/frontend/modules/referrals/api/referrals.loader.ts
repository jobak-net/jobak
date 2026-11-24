import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ApiError } from "@/frontend/shared/api";
import { serverFetch } from "@/frontend/shared/api/server";
import { REFERRALS_API_PATH, type ReferralInvite } from "@/shared/contracts/referrals";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/shared/routes";

import { formatJoined } from "../lib/format-joined";
import type { ReferralInviteView } from "../types/referrals.types";

/**
 * The origin to build the link on, from the request itself.
 *
 * Not the hard-coded `metadataBase`: a self-hosted or staging instance has its
 * own domain, and a referral link pointing at someone else's site is useless.
 * Behind a proxy the original host and scheme arrive as `x-forwarded-*`.
 */
async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto =
    list.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * What /dashboard/referrals renders with: the user's invite link and who
 * joined through it (`GET /api/v1/referrals`). Only called with sign-in on.
 *
 * The list may come back `null` (couldn't be read) while the link is still
 * there; the panel says the list is missing. If the request fails as a whole
 * there is no code to build a link from, so it goes to the error boundary.
 */
export async function loadReferralInvite(): Promise<ReferralInviteView> {
  const result = await serverFetch<ReferralInvite>(REFERRALS_API_PATH);
  if (result.kind === "unauthorized") redirect(SIGN_IN_HREF);
  if (result.kind === "failed") throw ApiError.from(result);

  return {
    link: `${await requestOrigin()}${SIGN_UP_HREF}?ref=${result.data.code}`,
    referrals:
      result.data.referrals?.map((r) => ({ displayName: r.displayName, joined: formatJoined(new Date(r.joinedAt)) })) ??
      null,
  };
}
