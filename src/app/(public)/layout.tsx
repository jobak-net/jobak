// Shared Layout
import { Navigation, FooterSection } from "@/frontend/components/public";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading auth state opts the public pages into dynamic rendering. That is the

  return (
  <>
    <Navigation />
    {children}
    <FooterSection />
  </>);
}
