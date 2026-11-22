import type { Metadata } from "next";

import { FeaturesView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "Features — Jobak",
  description:
    "AI relevance scoring, multi-platform coverage, filters that match how people actually search, and an encrypted API key.",
};

export default function FeaturesPage() {
  return <FeaturesView />;
}
