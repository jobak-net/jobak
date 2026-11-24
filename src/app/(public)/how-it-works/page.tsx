import type { Metadata } from "next";

import { HowItWorksView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "How it works — Jobak",
  description:
    "From the six onboarding questions to a ranked list of matches: what Jobak does at each stage, and what it does with your data.",
};

export default function HowItWorksPage() {
  return <HowItWorksView />;
}
