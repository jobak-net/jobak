import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AuthShowcase } from "@/frontend/components/auth/auth-showcase";
import { JobakLogo } from "@/frontend/components/shared/jobak-logo";
import { isAuthEnabled } from "@/backend/modules/auth/infrastructure/config";

/**
 * Shell for /login and /register.
 *
 * Desktop: the form column on the left — logo and a way back to the site at
 * the top, the form centred, the legal line at the bottom — and an inset visual
 * panel on the right with the pitch and a preview of the product. Phones get
 * the form column alone.
 *
 * No site navigation: someone mid sign-in has one thing to do. "Back to site"
 * is the single way out.
 *
 * With auth disabled there is no sign-in to show (and no ClerkProvider for the
 * form to work under), so these routes send the visitor to the dashboard, where
 * they are already the owner.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isAuthEnabled()) redirect("/dashboard");

  return (
    <main className="min-h-dvh bg-(--bg-canvas) p-3 sm:p-4">
      <div className="grid min-h-[calc(100dvh-1.5rem)] gap-4 sm:min-h-[calc(100dvh-2rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="flex flex-col px-3 py-3 sm:px-8 sm:py-4 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <JobakLogo showText />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border-standard px-3 py-1.5 text-[13px] text-fg-tertiary transition-colors hover:border-border-strong hover:text-fg-primary"
            >
              <ArrowLeft className="size-3.5" />
              Back to site
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center py-12">{children}</div>

          <footer className="flex flex-col-reverse gap-2 text-xs text-fg-quaternary sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Jobak</p>
            <p>
              By continuing you agree to the{" "}
              <Link href="/terms" className="underline underline-offset-2 hover:text-fg-secondary">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-fg-secondary">
                Privacy Policy
              </Link>
              .
            </p>
          </footer>
        </section>

        <AuthShowcase />
      </div>
    </main>
  );
}
