import { ClerkProvider } from "@clerk/nextjs";

// Providers
import { RootProvider } from "@/frontend/providers";

// AUTH
import {
  getClerkKeys,
  isAuthEnabled,
} from "@/backend/modules/auth/infrastructure/config";
import { clerkAppearance } from "@/frontend/lib/configs/clerk-appearance";
import { SIGN_IN_HREF, SIGN_UP_HREF } from "@/frontend/lib/configs/cta";

// STYLES
import { geistSans, geistMono } from "@/frontend/lib";
import "./globals.css";

// SEO
import { jobakMetadata, jobakViewport } from "@/frontend/lib";
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
            publishableKey={getClerkKeys().publishableKey}
            signInUrl={SIGN_IN_HREF}
            signUpUrl={SIGN_UP_HREF}
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
