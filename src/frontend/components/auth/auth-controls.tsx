"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";

import { Button } from "@/frontend/components/ui";
import { DASHBOARD_HREF, SIGN_IN_HREF, SIGN_UP_HREF } from "@/frontend/lib/configs/cta";
import { useAuthEnabled } from "@/frontend/providers";

interface AuthControlsProps {
  /** `mobile` fills the menu overlay's footer row; `desktop` sits in the bar. */
  layout?: "desktop" | "mobile";
  /** Lets the mobile menu close itself when a link is followed. */
  onNavigate?: () => void;
}

/**
 * Sign in / sign up when signed out, the way into the dashboard when signed in.
 *
 * No account avatar here: the public site only needs to get a signed-in
 * visitor back to the dashboard, and the account menu (sign out included)
 * lives in the dashboard's top bar.
 *
 * Plain links to the auth pages rather than Clerk's modal buttons: the pages
 * are real URLs that can be linked to, bookmarked and returned to, and they
 * behave the same with JavaScript still loading.
 *
 * With auth disabled there is no account — every visitor is already the owner —
 * so the only control is the way into the dashboard. Nothing from Clerk may
 * render then: there is no ClerkProvider above this to make it work.
 */
export function AuthControls({ layout = "desktop", onNavigate }: AuthControlsProps) {
  const authEnabled = useAuthEnabled();
  const mobile = layout === "mobile";

  /*
   * `primary` rather than the default variant recoloured with `bg-accent`: the
   * default carries `hover:bg-primary/90`, and `primary` here is the near-white
   * text token, so a green button turned white on hover.
   */
  const dashboardButton = (
    <Button
      variant="primary"
      size={mobile ? "default" : "sm"}
      className={mobile ? "flex-1 rounded-full h-14" : "rounded-full"}
      asChild
    >
      <Link href={DASHBOARD_HREF} onClick={onNavigate}>
        Dashboard
      </Link>
    </Button>
  );

  if (!authEnabled) return dashboardButton;

  return (
    <>
      <Show when="signed-out">
        <Button
          variant={mobile ? "secondary" : "quiet"}
          size={mobile ? "default" : "sm"}
          className={mobile ? "flex-1 h-14 rounded-full" : "rounded-full"}
          asChild
        >
          <Link href={SIGN_IN_HREF} onClick={onNavigate}>
            Sign in
          </Link>
        </Button>
        <Button
          variant="primary"
          size={mobile ? "default" : "sm"}
          className={mobile ? "flex-1 rounded-full h-14" : "rounded-full"}
          asChild
        >
          <Link href={SIGN_UP_HREF} onClick={onNavigate}>
            Sign up
          </Link>
        </Button>
      </Show>
      <Show when="signed-in">{dashboardButton}</Show>
    </>
  );
}
