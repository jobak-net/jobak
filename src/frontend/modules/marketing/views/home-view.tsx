import { HeroSection } from "../components/home/hero";
import { HowItWorksSection } from "../components/home/how-it-works";
import { FeaturesSection } from "../components/home/features";
import { DashboardPreviewSection } from "../components/home/dashboard-preview";
import { FreeSection } from "../components/home/free";
import { CtaSection } from "../components/home/cta";

/** The landing page: one section after another. */
export function HomeView() {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardPreviewSection />
      <FreeSection />
      <CtaSection />
    </main>
  );
}
