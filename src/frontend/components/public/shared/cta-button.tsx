import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { resolveCta } from "@/frontend/lib/configs/cta";

interface CtaButtonProps {
  /** The wording for this page's CTA. Every one leads to the waitlist. */
  signedOutText: string;
  className?: string;
  size?: "sm" | "lg" | "default";
}

/**
 * The primary CTA. Deliberately has no "use client" directive so it can render
 * inside either a server or a client tree.
 */
export function CtaButton({
  signedOutText,
  className = "bg-accent hover:bg-accent-bright text-(--bg-canvas) px-8 h-14 rounded-full group font-medium",
  size = "lg",
}: CtaButtonProps) {
  const { text, href } = resolveCta(signedOutText);

  return (
    <Button size={size} className={className} asChild>
      <Link href={href}>
        {text}
        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
      </Link>
    </Button>
  );
}
