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

/**
 * Where the primary call to action goes: creating an account.
 *
 * With auth disabled the sign-up page redirects home, so the CTA stays
 * harmless there rather than needing a second branch in every caller.
 */
export function resolveCta(text: string): Cta {
    return { text, href: SIGN_UP_HREF };
}
