import type { Metadata } from "next";

import { FaqView } from "@/frontend/modules/marketing";

export const metadata: Metadata = {
  title: "FAQ — Jobak",
  description:
    "Is Jobak free, why does it need your own Groq API key, where do the jobs come from, and who can see your data.",
};

export default function FaqPage() {
  return <FaqView />;
}
