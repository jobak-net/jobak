import type { Metadata } from "next";

import { TermsView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "Terms of Service — Jobak",
  description:
    "The terms you agree to by using the Jobak website and creating an account.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <TermsView />;
}
