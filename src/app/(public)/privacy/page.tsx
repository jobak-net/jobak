import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalProse,
  LegalSection,
  LegalUpdated,
} from "@/frontend/components/public/legal/legal-prose";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

/**
 * The privacy policy.
 *
 * Written against what the code actually does, not from a template — every
 * claim here corresponds to something in the repository:
 *
 *  - the waitlist table and its columns   db/supabase/016_waitlist.sql
 *  - what the sign-up form sends          components/public/waitlist/
 *  - the rate limiter storing an IP hash  db/supabase/015_rate_limits.sql
 *
 * If any of those change, this page is part of the change.
 */
export const metadata: Metadata = {
  title: "Privacy Policy — Jobak",
  description:
    "What Jobak collects, why, how long it is kept, and how to have it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Legal"
        title={
          <>
            Privacy
            <br />
            <span className="text-muted-foreground">policy.</span>
          </>
        }
        lead="Jobak is not open to the public yet. Right now the only thing collected is a waitlist signup, and this page says exactly what that involves."
      />

      <LegalUpdated date="19 September 2026" />

      <LegalProse>
        <LegalSection id="who-we-are" heading="Who we are">
          <p>
            Jobak is an AI-assisted job matching service, operated from Egypt and
            reachable at{" "}
            <a
              href="mailto:hello@jobak.net"
              className="text-accent-text underline underline-offset-2"
            >
              hello@jobak.net
            </a>
            . For anything in this policy — including a request to delete your
            data — that address reaches a person.
          </p>
        </LegalSection>

        <LegalSection id="what-we-collect" heading="What we collect">
          <p>
            While Jobak is pre-launch, joining the waitlist is the only way to
            give us anything. That form stores:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Your email address</strong> —
              required, because it is how we tell you we have opened.
            </li>
            <li>
              <strong className="text-foreground">
                Your field and work preference
              </strong>{" "}
              — optional, asked after you join. Used to decide which roles to
              have ready first. Skipping them changes nothing about your place
              on the list.
            </li>
            <li>
              <strong className="text-foreground">
                Where you came from
              </strong>{" "}
              — the page that linked you, and a marker in the link itself, so we
              know which channels worked.
            </li>
          </ul>
          <p>
            We do not ask for your name, phone number, CV or salary, and there is
            no account to create yet.
          </p>
        </LegalSection>

        <LegalSection id="automatically" heading="What is collected automatically">
          <p>
            To stop the sign-up form being used to send junk, we store your IP
            address alongside a count of recent submissions, and pause the form
            if there are too many in a short window. Those records are cleared
            out routinely and are never linked to your waitlist entry.
          </p>
          <p>
            We do not use analytics, advertising or tracking cookies. The site
            sets no cookies at all while it is pre-launch.
          </p>
        </LegalSection>

        <LegalSection id="jobs" heading="The job listings">
          <p>
            The{" "}
            <Link href="/jobs" className="text-accent-text underline underline-offset-2">
              jobs board
            </Link>{" "}
            is public and needs no account. Browsing it stores nothing about
            you.
          </p>
          <p>
            The listings themselves are collected from public sources — job
            boards and companies&apos; own career pages — and each one links back
            to where it was published. If you are an employer and would rather a
            listing were not shown here, email us and it will be removed.
          </p>
        </LegalSection>

        <LegalSection id="why" heading="Why we are allowed to hold it">
          <p>
            Consent. You typed your address into a form asking to be told when
            Jobak launches, and that is the only thing it is used for. You can
            withdraw that consent at any time by asking us to delete it, and
            every email we send will carry an unsubscribe link.
          </p>
        </LegalSection>

        <LegalSection id="sharing" heading="Who else sees it">
          <p>We do not sell your data, and we do not share it for advertising.</p>
          <p>Three services process it on our behalf:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Supabase</strong> — hosts the
              database the waitlist is stored in.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — runs the
              website itself.
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> — delivers the
              emails we send you.
            </li>
          </ul>
          <p>
            Each is bound to use the data only to provide that service. We will
            also disclose data where the law requires it.
          </p>
        </LegalSection>

        <LegalSection id="how-long" heading="How long we keep it">
          <p>
            Your waitlist entry is kept until Jobak launches and you have been
            invited, or until you ask us to delete it — whichever comes first.
            If the project is abandoned, the list is deleted rather than kept or
            transferred.
          </p>
        </LegalSection>

        <LegalSection id="your-rights" heading="Your rights">
          <p>
            You can ask us to show you what we hold about you, correct it, delete
            it, or send it to you in a portable form. Email{" "}
            <a
              href="mailto:hello@jobak.net"
              className="text-accent-text underline underline-offset-2"
            >
              hello@jobak.net
            </a>{" "}
            and we will act within 30 days.
          </p>
          <p>
            Deleting a waitlist entry is immediate and permanent — we keep no
            copy, so rejoining later starts a new entry.
          </p>
        </LegalSection>

        <LegalSection id="security" heading="Security">
          <p>
            The site is served over HTTPS and the database is reachable only by
            the application, over an encrypted connection. No part of the
            waitlist is exposed to the browser.
          </p>
          <p>
            No system is perfectly secure. If something does go wrong in a way
            that affects you, we will tell you rather than hope you do not
            notice.
          </p>
        </LegalSection>

        <LegalSection id="changes" heading="Changes to this policy">
          <p>
            Jobak is being built, so this policy will change as it grows —
            accounts, saved searches and AI matching will each add to what is
            collected. The date at the top always reflects the current version,
            and material changes will be emailed to anyone on the list before
            they take effect.
          </p>
        </LegalSection>
      </LegalProse>
    </PageShell>
  );
}
