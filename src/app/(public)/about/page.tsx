import type { Metadata } from "next";

import { AboutView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "About — Jobak",
  description:
    "What Jobak is, why it exists, and how it finds and ranks jobs for you across every major job board.",
};

export default function AboutPage() {
  return <AboutView />;
}
