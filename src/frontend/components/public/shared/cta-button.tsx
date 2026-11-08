import { Button } from "@/frontend/components/ui/button";
import { AccountCtaLink } from "./account-cta";

interface CtaButtonProps {
  /** The wording for signed-out visitors. Signed-in ones get "Refer a friend"; see AccountCtaLink. */
  text: string;
  className?: string;
  size?: "sm" | "lg" | "default";
}

/**
 * The primary CTA. Deliberately has no "use client" directive so it can render
 * inside either a server or a client tree.
 */
export function CtaButton({
  text: label,
  className = "bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 rounded-full group font-medium",
  size = "lg",
}: CtaButtonProps) {
  return (
    <Button size={size} className={className} asChild>
      <AccountCtaLink signedOutText={label} withArrow />
    </Button>
  );
}
