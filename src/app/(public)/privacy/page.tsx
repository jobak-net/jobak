import type { Metadata } from "next";

import { PrivacyView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "Privacy Policy — Jobak",
  description:
    "What Jobak collects, why, how long it is kept, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyView />;
}
