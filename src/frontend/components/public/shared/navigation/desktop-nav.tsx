import Link from "next/link";
import { Button } from "@/frontend/components/ui";
import { NavLogo } from "./nav-logo";

import { landingNavLinks as navLinks } from "@/frontend/lib";

interface DesktopNavigationProps {
  isScrolled: boolean;
}

export function DesktopNavigation({ isScrolled }: DesktopNavigationProps) {
  return (
    <header className={`hidden md:block fixed z-50 transition-all duration-500 ${isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"}`}>
      <nav className={`mx-auto transition-all duration-500 ${isScrolled ? "bg-background/85 backdrop-blur-md border border-foreground/10 rounded-2xl shadow-lg max-w-5xl" : "bg-transparent max-w-7xl"}`}>
        <div className={`flex items-center justify-between px-6 lg:px-8 transition-all duration-500 ${isScrolled ? "h-14" : "h-20"}`}>
          <NavLogo isScrolled={isScrolled} />

          <div className="flex items-center gap-12">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href} className="text-sm text-foreground/70 hover:text-foreground transition-colors relative group">
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/*
              * One call to action while the product is pre-launch. There is no
              * sign-in to offer yet, so a "Sign in" link would lead nowhere.
              */}
            <Button size="sm" className="bg-accent rounded-full" asChild>
              <Link href="/#waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
}
