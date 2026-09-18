export interface Cta {
    text: string;
    href: string;
}

/**
 * Where the primary call to action goes while the product is pre-launch.
 *
 * Every CTA leads to the waitlist. There is no account to create yet and no
 * dashboard to return to, so the auth-aware branching this module used to do
 * has nothing left to branch on — it was removed rather than left as a
 * permanently-false condition that would quietly rot.
 *
 * The anchor rather than a page of its own: the form lives on the home page, so
 * a CTA elsewhere should land on it directly rather than on a second page that
 * only repeats the pitch.
 */
export const WAITLIST_HREF = "/#waitlist";

export function resolveCta(signedOutText: string): Cta {
    return { text: signedOutText, href: WAITLIST_HREF };
}
