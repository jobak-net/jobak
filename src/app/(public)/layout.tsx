import { Navigation, FooterSection } from "@/frontend/modules/marketing";

/**
 * Every public page: the site navigation and footer around it. Reads no auth
 * state on the server — the nav's account controls decide "Sign in" or
 * "Dashboard" in the browser — so the static pages stay static.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navigation />
      {children}
      <FooterSection />
    </>
  );
}
