import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";
import { PersonCard, talentJsonLd } from "@/frontend/components/public/talent";
import { JsonLd } from "@/frontend/components/shared/json-ld";
import { loadTalent } from "@/frontend/lib/api/loaders/talent";

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

  return (
    <PageShell>
      {people.length > 0 && (
        <JsonLd data={talentJsonLd(people)} />
      )}

      <PageIntro
        eyebrow="Talent"
        title={
          <>
            People looking,
            <br />
            <span className="text-muted-foreground">on their own terms.</span>
          </>
        }
        lead="Everyone here chose to be listed. Profiles are off by default, each person picks what their card shows, and nobody's email appears on this page."
      />

      {people.length === 0 ? (
        <div className="mt-16 max-w-xl">
          <p className="text-muted-foreground">
            Nobody has published a profile yet. If you have a Jobak account, you can add yours from{" "}
            <Link href="/dashboard/profile" className="text-accent underline underline-offset-2">
              your dashboard
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => (
            <PersonCard key={person.slug} person={person} />
          ))}
        </div>
      )}

      <p className="mt-16 text-sm text-muted-foreground max-w-xl">
        Listed here and changed your mind? Unpublishing from your dashboard removes the card
        immediately.
      </p>
    </PageShell>
  );
}
