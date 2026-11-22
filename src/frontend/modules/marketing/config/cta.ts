import { DASHBOARD_HREF, REFERRALS_HREF, SIGN_UP_HREF } from "@/shared/routes";

/** The page URLs themselves live in `@/shared/routes`, for the backend's use too. */

export interface Cta {
    text: string;
    href: string;
}

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
