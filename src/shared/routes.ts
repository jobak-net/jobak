/**
 * The app's own page URLs, for every side that needs them: links and redirects
 * in the frontend, Clerk's settings and the proxy steps in the backend.
 * Imports nothing (see `./referral-cookie` for the rule of this folder).
 */

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
