export interface Cta {
    text: string;
    href: string;
}

/**
 * The auth pages. Passed to Clerk as `signInUrl` / `signUpUrl` as well, so
 * Clerk's own redirects and every link in the app agree on one place.
 *
 * `/login` and `/register` rather than Clerk's `/sign-in` default: these were
 * the URLs of the earlier staging deployment, so links to them still work.
 */
export const SIGN_IN_HREF = "/login";
export const SIGN_UP_HREF = "/register";

/** Where signing in or up lands, and where the nav sends a signed-in visitor. */
export const DASHBOARD_HREF = "/dashboard";

/** Where a new account goes first: the job search questions. */
export const ONBOARDING_HREF = "/onboarding";

/** The second onboarding: connecting the AI that ranks jobs. Required, not skippable. */
export const AI_SETUP_HREF = "/onboarding/ai";

/** The referral page — what a signed-in visitor is offered instead of sign-up. */
export const REFERRALS_HREF = "/dashboard/referrals";

/**
 * Who is looking at a marketing page, as far as its call to action cares.
 *
 *  - `signed-out`: offer an account.
 *  - `signed-in`:  they have one already; offer to invite a friend instead.
 *  - `local`:      auth is disabled on this instance. There is one owner and
 *                  nobody to refer, so the CTA just opens the dashboard.
 */
export type CtaAudience = "signed-out" | "signed-in" | "local";

/**
 * The call to action for an audience.
 *
 * Signed-out visitors keep the page's own wording ("Get started free",
 * "Create a free account"); the other two get one fixed label each, so every
 * page says the same thing for the same intent.
 */
export function resolveCta(signedOutText: string, audience: CtaAudience = "signed-out"): Cta {
    if (audience === "signed-in") return { text: "Refer a friend", href: REFERRALS_HREF };
    if (audience === "local") return { text: "Open dashboard", href: DASHBOARD_HREF };
    return { text: signedOutText, href: SIGN_UP_HREF };
}
