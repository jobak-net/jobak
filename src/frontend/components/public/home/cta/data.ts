export const ctaContent = {
    heading: {
        line1: "Your next job",
        line2: "is one search away.",
    },
    description: "Stop scrolling job boards manually. Let AI do the work — set your preferences once and get ranked matches delivered instantly.",
    primaryButton: {
        text: "Join the waitlist",
        href: "/#waitlist",
    },
    secondaryButton: {
        text: "See how it works",
        href: "/#how-it-works",
    },
    /*
     * Two clauses rather than one string, so the line can only ever break at
     * the separator. Left as a single sentence it broke mid-clause on a phone
     * ("…under 2 / minutes") and ran into the card's corner rule.
     */
    disclaimer: ["No credit card required ·", "Results in under 2 minutes"],
};
