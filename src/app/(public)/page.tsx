import {
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
  DashboardPreviewSection,
  FreeSection,
  CtaSection,
  WaitlistSection
} from "@/frontend/components/public";

export default async function Home() {

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <HeroSection />
      <WaitlistSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <FreeSection />
      <CtaSection />
    </main>
  );
}
