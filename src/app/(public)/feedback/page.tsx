import type { Metadata } from "next";

import { FeedbackView } from "@/frontend/modules/feedback";

const TITLE = "Feedback";
const DESCRIPTION =
  "Tell us what is broken, what is missing, or which listing is wrong. No account needed, and no email required unless you want a reply.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  alternates: { canonical: "/feedback" },
  openGraph: {
    type: "website",
    title: `${TITLE} — Jobak`,
    description: DESCRIPTION,
    url: "/feedback",
    siteName: "Jobak",
  },
};

/** The feedback page. What it shows lives in the feedback module. */
export default function FeedbackPage() {
  return <FeedbackView />;
}
