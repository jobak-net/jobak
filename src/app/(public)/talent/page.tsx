import type { Metadata } from "next";

import { TalentView } from "@/frontend/modules/talent";
import { loadTalent } from "@/frontend/modules/talent/server";

const TITLE = "Hire developers and designers in MENA";
const DESCRIPTION =
  "Candidates across Egypt, Saudi Arabia, the UAE and the wider MENA region who chose to be listed publicly. " +
  "Every profile here was published by the person it belongs to, with the fields they picked.";

export const metadata: Metadata = {
  title: `${TITLE} — Jobak`,
  description: DESCRIPTION,
  keywords: [
    "hire developers MENA", "hire engineers Egypt", "hire developers Saudi Arabia",
    "MENA talent", "Egypt developers", "remote talent MENA", "مطورين", "توظيف",
  ],
  alternates: { canonical: "/talent" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "/talent",
    siteName: "Jobak",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  /*
   * Followed but not indexed while the directory is opt-in and small. An
   * indexed page of a handful of real people is worse for them and for us than
   * no listing at all — and search engines rank a thin directory badly anyway.
   * Flip this to `index: true` once it has enough profiles to be worth finding.
   */
  robots: { index: false, follow: true },
};

/*
 * Rendered per request, which for this page is the property we want rather than
 * a cost to justify: someone who unpublishes expects their card gone, and any
 * amount of stale cache is that long serving a withdrawn consent.
 *
 * (It would be dynamic regardless — the `(public)` layout reads auth. But here
 * it is also the correct choice.)
 */

export default async function TalentPage() {
  const people = await loadTalent();
  return <TalentView people={people} />;
}
