"use client";

import { useEffect } from "react";

import { REFERRAL_COOKIE } from "@/shared/referral-cookie";

/**
 * Claims a pending referral, once, on the dashboard.
 *
 * The sign-up link left the referrer's code in a cookie; the first dashboard
 * visit after the account exists hands it to the server, which records the
 * referral and clears the cookie. Renders nothing.
 *
 * Checks for the cookie first so the request is only made when there is
 * something to claim — that is every visit for nobody, and one visit for
 * someone who arrived through a friend's link.
 */
export function ReferralClaim() {
    useEffect(() => {
        const pending = document.cookie.split("; ").some((pair) => pair.startsWith(`${REFERRAL_COOKIE}=`));
        if (!pending) return;

        // Fire and forget: a failure leaves the cookie, and the next visit tries again.
        fetch("/api/v1/referrals/claim", { method: "POST", credentials: "same-origin" }).catch(() => {});
    }, []);

    return null;
}
