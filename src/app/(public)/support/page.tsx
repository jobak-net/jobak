import type { Metadata } from "next";

import { SupportView } from "@/frontend/modules/marketing";

const TITLE = "Buy me a coffee";
const DESCRIPTION =
  "Jobak is free and stays free. If it helped you find something, here is how to help back — most of it costs nothing.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  alternates: { canonical: "/support" },
  openGraph: {
    type: "website",
    title: `${TITLE} — Jobak`,
    description: DESCRIPTION,
    url: "/support",
    siteName: "Jobak",
  },
};

export default function SupportPage() {
  return <SupportView />;
}
