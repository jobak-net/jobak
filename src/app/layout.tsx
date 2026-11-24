import { ClerkProvider } from "@clerk/nextjs";

// Providers
import { RootProvider } from "@/frontend/shared/providers";

// AUTH
import { clerkPublishableKey, isAuthEnabled } from "@/shared/auth";
import { clerkAppearance, jobakMetadata, jobakViewport } from "@/frontend/shared/config";
import { DASHBOARD_HREF, ONBOARDING_HREF, SIGN_IN_HREF, SIGN_UP_HREF } from "@/shared/routes";

// STYLES
import { geistSans, geistMono } from "@/frontend/shared/styles/fonts";
import "./globals.css";

// SEO
export const metadata = jobakMetadata;
export const viewport = jobakViewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * With auth disabled there is no ClerkProvider at all — no Clerk script, no
   * keys needed — and client code checks `useAuthEnabled()` before using
   * anything from Clerk.
   */
  const authEnabled = isAuthEnabled();

  const app = <RootProvider authEnabled={authEnabled}>{children}</RootProvider>;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {authEnabled ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey()}
            signInUrl={SIGN_IN_HREF}
            signUpUrl={SIGN_UP_HREF}
            // Unless the visitor was sent to sign in from a specific page,
            // which Clerk returns them to, they land on the dashboard; a new
            // account goes to onboarding first. (The dashboard would send an
            // unfinished account there anyway — this just skips the hop.)
            signInFallbackRedirectUrl={DASHBOARD_HREF}
            signUpFallbackRedirectUrl={ONBOARDING_HREF}
            appearance={clerkAppearance}
          >
            {app}
          </ClerkProvider>
        ) : (
          app
        )}
      </body>
    </html>
  );
}
