"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { resolveCta, type CtaAudience } from "@/frontend/lib/configs/cta";
import { useAuthEnabled } from "@/frontend/providers";

/**
 * Which CTA audience the current visitor is.
 *
 * Split into its own component-level branch because `useAuth()` needs a
 * ClerkProvider above it, which does not exist with auth disabled — so the
 * Clerk-reading half only renders when auth is on.
 *
 * Until Clerk has loaded this reports `signed-out`, the same as the server
 * render, so there is no hydration mismatch; a signed-in visitor sees the
 * label swap a moment after load.
 */
function useClerkAudience(): CtaAudience {
    const { isLoaded, isSignedIn } = useAuth();
    return isLoaded && isSignedIn ? "signed-in" : "signed-out";
}

type LinkProps = Omit<React.ComponentProps<typeof Link>, "href" | "children">;

interface AccountCtaLinkProps extends LinkProps {
    /** The page's own wording for visitors without an account. */
    signedOutText: string;
    /** Trailing arrow, as the marketing buttons use. */
    withArrow?: boolean;
    arrowClassName?: string;
}

function CtaLinkBody({
    audience,
    signedOutText,
    withArrow,
    arrowClassName,
    ...linkProps
}: AccountCtaLinkProps & { audience: CtaAudience }) {
    const { text, href } = resolveCta(signedOutText, audience);
    return (
        <Link href={href} {...linkProps}>
            {text}
            {withArrow && <ArrowRight className={arrowClassName ?? "w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"} />}
        </Link>
    );
}

function ClerkCtaLink(props: AccountCtaLinkProps) {
    return <CtaLinkBody audience={useClerkAudience()} {...props} />;
}

/**
 * The primary call to action, aware of who is looking.
 *
 * Signed out: the page's sign-up wording, to /register. Signed in: "Refer a
 * friend", to the referral page — telling someone who already has an account
 * to create one is noise. Auth disabled: "Open dashboard".
 *
 * Just a link with styling props, not a button, so callers keep wrapping it in
 * `<Button asChild>` exactly as before — and so server components can render
 * it, which they could not if it took a render function.
 */
export function AccountCtaLink(props: AccountCtaLinkProps) {
    const authEnabled = useAuthEnabled();
    if (!authEnabled) return <CtaLinkBody audience="local" {...props} />;
    return <ClerkCtaLink {...props} />;
}

interface AudienceSwitchProps {
    signedOut: React.ReactNode;
    signedIn: React.ReactNode;
    local: React.ReactNode;
}

function ClerkAudienceSwitch({ signedOut, signedIn }: AudienceSwitchProps) {
    return <>{useClerkAudience() === "signed-in" ? signedIn : signedOut}</>;
}

/**
 * Renders one of three pieces of content by audience, for copy that changes
 * more than a link — a sentence pitching an account reads wrong to someone who
 * has one. Takes elements, not functions, so server components can use it.
 */
export function AudienceSwitch(props: AudienceSwitchProps) {
    const authEnabled = useAuthEnabled();
    if (!authEnabled) return <>{props.local}</>;
    return <ClerkAudienceSwitch {...props} />;
}
