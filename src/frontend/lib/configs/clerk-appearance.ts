/**
 * Clerk's components, dressed in the site's palette.
 *
 * The values mirror the tokens in `app/globals.css`. Hex rather than `var()`:
 * Clerk derives hover, border and shadow shades from these by computing on the
 * colour, which it cannot do with an unresolved custom property. The accent is
 * `--accent` resolved to sRGB — the same value `email-templates/build.mjs`
 * uses, for the same reason.
 *
 * Variables only, no theme package: the site has one dark palette, and these
 * cover it without another dependency.
 */
export const clerkAppearance = {
    variables: {
        colorPrimary: "#58e68c",
        colorPrimaryForeground: "#08090a",
        colorBackground: "#0f1011",
        colorForeground: "#f7f8f8",
        colorMutedForeground: "#8a8f98",
        colorMuted: "#191a1b",
        colorInput: "#191a1b",
        colorInputForeground: "#f7f8f8",
        colorNeutral: "#f7f8f8",
        borderRadius: "0.75rem",
    },
};
