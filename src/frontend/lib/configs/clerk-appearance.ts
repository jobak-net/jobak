/**
 * Clerk's components, dressed in the site's palette and controls.
 *
 * Two levels, on purpose:
 *
 *  - `clerkAppearance` goes on `ClerkProvider` and so applies to every Clerk
 *    component, including the account menu and "Manage account" window. It sets
 *    colours, the cascade layer and the checkbox/radio design — nothing that
 *    changes a component's structure.
 *
 *  - `authFormAppearance` goes on `<SignIn>` / `<SignUp>` only, and restyles
 *    their parts with the site's own classes. Kept off the provider because it
 *    dissolves the card, which would leave the account popover with no
 *    background at all.
 *
 * Colours are hex rather than `var()`: Clerk computes hover, border and shadow
 * shades from them, which it cannot do with an unresolved custom property. The
 * accent is `--accent` resolved to sRGB, as in `email-templates/build.mjs`.
 */
/*
 * The site's tokens, resolved — style objects cannot read CSS custom
 * properties through Clerk's colour maths, so the values from globals.css are
 * repeated here once.
 */
const t = {
    text: "#f7f8f8", // --fg-primary
    textSecondary: "#d0d6e0", // --fg-secondary
    textTertiary: "#8a8f98", // --fg-tertiary
    textQuaternary: "#62666d", // --fg-quaternary
    hairline: "rgba(255, 255, 255, 0.05)", // --border-subtle
    border: "rgba(255, 255, 255, 0.08)", // --border-standard
    borderStrong: "rgba(255, 255, 255, 0.12)", // --border-strong
    field: "rgba(255, 255, 255, 0.025)",
    fieldActive: "rgba(255, 255, 255, 0.045)",
    accent: "#58e68c", // --accent
    accentBright: "#74f59c", // --accent-bright
    accentText: "#9cffa0", // --accent-text
    onAccent: "#06210f",
    radius: "10px", // --radius-control
};

/**
 * Checkboxes and radio buttons, drawn from scratch.
 *
 * Clerk's checkbox paints its tick as a background image on a native input.
 * Left to the browser it renders as the OS control, and anything that sizes
 * inputs — a 44px text-field height, say — stretches it into a tall pill with
 * the tick repeating down it. So the native look is switched off (`appearance:
 * none`) and the control is built from the site's tokens: an 18px square at the
 * control radius, a hairline border, and when checked a solid accent fill with
 * one dark tick, centred and never repeated.
 */
const CHECK_ICON =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M3.5 8.5l3 3 6-7' stroke='%2306210f' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

const choiceControl = {
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    flexShrink: 0,
    width: "18px",
    height: "18px",
    minHeight: "18px",
    margin: 0,
    padding: 0,
    border: `1px solid ${t.borderStrong}`,
    background: t.field,
    backgroundImage: "none",
    boxShadow: "none",
    cursor: "pointer",
    transition: "background-color 120ms, border-color 120ms",
    "&:hover": { borderColor: "rgba(255, 255, 255, 0.24)" },
    "&:focus-visible": { outline: "none", boxShadow: "0 0 0 3px rgba(88, 230, 140, 0.35)" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
};

const checkbox = {
    ...choiceControl,
    borderRadius: "5px",
    "&:checked": {
        background: t.accent,
        borderColor: t.accent,
        backgroundImage: CHECK_ICON,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "12px 12px",
    },
};

const radio = {
    ...choiceControl,
    borderRadius: "999px",
    "&:checked": {
        borderColor: t.accent,
        background: `radial-gradient(circle, ${t.accent} 0 4px, transparent 4.5px)`,
    },
};

/** The checkbox, radio and their labels, shared by every Clerk component. */
const choiceElements = {
    formFieldCheckboxInput: checkbox,
    formFieldCheckboxLabel: { fontSize: "14px", color: t.textSecondary, cursor: "pointer" },
    formFieldRadioInput: radio,
    formFieldRadioLabel: { fontSize: "14px", color: t.textSecondary, cursor: "pointer" },
};

export const clerkAppearance = {
    /*
     * Clerk's CSS goes in its own layer, ordered below Tailwind's utilities at
     * the top of globals.css, so classes passed to `elements` win over Clerk's
     * defaults instead of losing to them.
     */
    cssLayerName: "clerk",
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
        borderRadius: "0.625rem",
    },
    /*
     * Element-level, so safe on the provider: they restyle only checkboxes and
     * radios, in every Clerk component — the account window included.
     */
    elements: { ...choiceElements },
};


/**
 * The sign-in and sign-up forms, made part of the page rather than a box on it.
 *
 * No card at all: no border, shadow, fill or padding, and no grey footer strip.
 * The form sits directly in the left column and its fields, buttons and links
 * are the column's own — same surfaces, heights, radius and accent as the rest
 * of the app.
 *
 * Style objects, not Tailwind classes. Clerk merges an object straight into the
 * element's own styles, so it always takes effect; a class has to out-rank
 * Clerk's CSS through the cascade layer, and loses wherever Clerk styles a
 * property through its own variables. Objects make the reset unconditional.
 */
export const authFormAppearance = {
    layout: {
        // The page header already shows our logo.
        logoPlacement: "none" as const,
        // Email first, social sign-in below the "or" divider, as two labelled buttons.
        socialButtonsPlacement: "bottom" as const,
        socialButtonsVariant: "blockButton" as const,
        // The orange "Development mode" label inside the form. Only ever shown on
        // development keys, so hiding it changes nothing in production.
        unsafe_disableDevelopmentModeWarnings: true,
    },
    elements: {
        rootBox: { width: "100%", maxWidth: "400px" },
        cardBox: {
            width: "100%",
            maxWidth: "100%",
            border: "none",
            borderRadius: 0,
            boxShadow: "none",
            background: "transparent",
            overflow: "visible",
        },
        card: {
            border: "none",
            borderRadius: 0,
            boxShadow: "none",
            background: "transparent",
            padding: 0,
            gap: "28px",
        },

        /*
         * Clerk's logo, removed outright. `logoPlacement: "none"` above should
         * already do it, but is not honoured on every component, and the page's
         * top-left corner already carries ours.
         */
        logoBox: { display: "none" },
        logoImage: { display: "none" },

        // Left-aligned, under the logo in the column's top-left corner.
        header: { alignItems: "flex-start", textAlign: "left" },
        headerTitle: {
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "-0.035em",
            lineHeight: 1.2,
            color: t.text,
            textAlign: "left",
        },
        headerSubtitle: { fontSize: "14px", color: t.textTertiary, textAlign: "left" },

        // Side by side while there are two providers; more wrap onto new rows.
        socialButtons: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
        socialButtonsBlockButton: {
            height: "44px",
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
            background: t.field,
            boxShadow: "none",
            "&:hover": { background: t.fieldActive, borderColor: t.borderStrong },
        },
        socialButtonsBlockButtonText: { fontSize: "14px", fontWeight: 500, color: t.textSecondary },

        dividerLine: { background: t.hairline },
        dividerText: { fontSize: "12px", color: t.textQuaternary },

        formFieldLabel: { fontSize: "13px", fontWeight: 500, color: t.textSecondary },
        formFieldInput: {
            height: "44px",
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
            background: t.field,
            boxShadow: "none",
            color: t.text,
            fontSize: "14px",
            "&::placeholder": { color: t.textQuaternary },
            "&:focus": { borderColor: "rgba(88, 230, 140, 0.5)", background: t.fieldActive, boxShadow: "none" },
            /*
             * Clerk gives checkboxes and radios this element too. Everything
             * above is for text fields, and stretched a checkbox into a 44px
             * pill with its tick repeating down it — so they get their own
             * design back here, by a selector more specific than the rules
             * above, whatever order Clerk applies its classes in.
             */
            '&[type="checkbox"]': checkbox,
            '&[type="radio"]': radio,
        },
        formFieldAction: { fontSize: "13px", fontWeight: 500, color: t.accentText, "&:hover": { color: t.accent } },
        formButtonPrimary: {
            height: "44px",
            borderRadius: t.radius,
            background: t.accent,
            backgroundImage: "none",
            color: t.onAccent,
            fontSize: "14px",
            fontWeight: 500,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { background: t.accentBright },
            "&:focus": { boxShadow: "none" },
            "&::after": { display: "none" },
        },

        otpCodeFieldInput: {
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
            background: t.field,
            color: t.text,
        },
        identityPreview: { borderRadius: t.radius, border: `1px solid ${t.border}`, background: t.field },

        // The grey strip under the form, gone: its contents sit on the column.
        footer: {
            background: "transparent",
            backgroundImage: "none",
            border: "none",
            borderTop: "none",
            boxShadow: "none",
            padding: 0,
            marginTop: 0,
        },
        footerItem: { background: "transparent", backgroundImage: "none" },
        footerActionText: { fontSize: "14px", color: t.textTertiary },
        footerActionLink: { fontSize: "14px", fontWeight: 500, color: t.accentText, "&:hover": { color: t.accent } },

        ...choiceElements,
    },
};
