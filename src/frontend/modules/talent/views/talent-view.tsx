import Link from "next/link";

import { JsonLd, PageIntro, PageShell } from "@/frontend/shared/components";
import type { TalentCard } from "@/shared/contracts/talent";

import { PersonCard } from "../components/person-card";
import { talentJsonLd } from "../lib/talent-json-ld";

/** The talent directory: the people who chose to be listed, or how to be the first. */
export function TalentView({ people }: { people: TalentCard[] }) {
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
