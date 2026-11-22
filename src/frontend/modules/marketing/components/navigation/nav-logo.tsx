import { JobakLogo } from "@/frontend/shared/ui";

export function NavLogo({ isScrolled }: { isScrolled: boolean }) {
  return <JobakLogo size={isScrolled ? "sm" : "md"} showText />;
}