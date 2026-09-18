import Link from "next/link";

export function FooterBottom() {
  return (
    <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
      <Copyright />
      <LegalLinks />
    </div>
  );
}

function Copyright() {
  return (
    <p className="text-sm text-muted-foreground">
      © {new Date().getFullYear()} Jobak. All rights reserved.
    </p>
  );
}

/**
 * The legal links live in the footer because that is where people look for
 * them, and because a privacy policy nobody can find does not do the job it
 * exists to do — the waitlist form links to it directly as well, at the point
 * where an address is actually being handed over.
 */
function LegalLinks() {
  return (
    <nav aria-label="Legal" className="flex items-center gap-6 text-sm">
      <Link
        href="/privacy"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Privacy
      </Link>
      <Link
        href="/terms"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Terms
      </Link>
      <a
        href="mailto:hello@jobak.net"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Contact
      </a>
    </nav>
  );
}
