"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";

import { Button } from "@/frontend/components/ui";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/frontend/lib/configs/cta";
import { useAuthEnabled } from "@/frontend/providers";

interface AuthControlsProps {
  /** `mobile` fills the menu overlay's footer row; `desktop` sits in the bar. */
  layout?: "desktop" | "mobile";
  /** Lets the mobile menu close itself when a link is followed. */
  onNavigate?: () => void;
}

/**
 * Sign in / sign up when signed out, the account menu when signed in.
 *
 * Plain links to the auth pages rather than Clerk's modal buttons: the pages
 * are real URLs that can be linked to, bookmarked and returned to, and they
 * behave the same with JavaScript still loading.
 *
 * With auth disabled there is no account at all — every visitor is already the
 * owner — so nothing renders. Nothing from Clerk may render then either: there
 * is no ClerkProvider above this to make its components work.
 */
export function AuthControls({ layout = "desktop", onNavigate }: AuthControlsProps) {
  const authEnabled = useAuthEnabled();
  if (!authEnabled) return null;

  const mobile = layout === "mobile";

  return (
    <>
      <Show when="signed-out">
        <Button
          variant="ghost"
          size={mobile ? "default" : "sm"}
          className={mobile ? "flex-1 h-14 rounded-full border border-foreground/20" : "rounded-full"}
          asChild
        >
          <Link href={SIGN_IN_HREF} onClick={onNavigate}>
            Sign in
          </Link>
        </Button>
        <Button
          size={mobile ? "default" : "sm"}
          className={mobile ? "flex-1 bg-accent rounded-full h-14" : "bg-accent rounded-full"}
          asChild
        >
          <Link href={SIGN_UP_HREF} onClick={onNavigate}>
            Sign up
          </Link>
        </Button>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  );
}
