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
 *  - accounts and sign-in                 Clerk; modules/auth, 017_clerk_auth.sql
 *  - the copy of email and name we keep   users table, synced by the webhook
 *  - deletion taking the data with it     ON DELETE CASCADE from users (014)
 *  - preferences, bookmarks, API keys     001_initial_schema.sql (keys encrypted)
 *  - the opt-in public profile            010_public_profiles.sql
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
        lead="What Jobak holds about you when you create an account and use it, who else handles it, and how to have it deleted."
      />

      <LegalUpdated date="7 November 2026" />

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
          <p>When you create an account:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">
                Your email address and name
              </strong>{" "}
              — held by Clerk, which runs sign-in for us, and copied to our own
              database so your settings and matches can be attached to you.
            </li>
            <li>
              <strong className="text-foreground">How you sign in</strong> — a
              password, or the social account you chose. Passwords are handled
              entirely by Clerk; we never see or store them.
            </li>
          </ul>
          <p>As you use Jobak, anything you choose to add is stored against your account:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Your job preferences</strong>{" "}
              — the fields, titles, countries and ways of working you want
              matches for.
            </li>
            <li>
              <strong className="text-foreground">Matches and bookmarks</strong>{" "}
              — the jobs scored for you, and the ones you saved.
            </li>
            <li>
              <strong className="text-foreground">API keys you connect</strong>{" "}
              — for the AI provider that ranks your matches. These are stored
              encrypted and only decrypted to make the requests you asked for.
            </li>
            <li>
              <strong className="text-foreground">A public profile</strong> — only
              if you turn it on. It is off by default, and turning it off removes
              it from the talent directory.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="automatically" heading="What is collected automatically">
          <p>
            Signing in uses cookies. Clerk sets them to keep you signed in and to
            recognise your session securely; they are needed for an account to
            work at all. Clerk also processes your IP address and browser details
            to protect sign-in from abuse.
          </p>
          <p>
            We do not use analytics, advertising or tracking cookies.
          </p>
        </LegalSection>

        <LegalSection id="jobs" heading="The job listings">
          <p>
            The{" "}
            <Link href="/jobs" className="text-accent-text underline underline-offset-2">
              jobs board
            </Link>{" "}
            is public and needs no account. Browsing it while signed out stores
            nothing about you.
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
            To provide the account you asked for. Your email, preferences and
            keys are what Jobak needs to find and rank jobs for you, and they are
            used for that and nothing else. A public profile is held on your
            consent, which you withdraw by turning it off.
          </p>
        </LegalSection>

        <LegalSection id="sharing" heading="Who else sees it">
          <p>We do not sell your data, and we do not share it for advertising.</p>
          <p>Three services process it on our behalf:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Clerk</strong> — runs sign-in
              and accounts, and sends account emails such as verification codes.
            </li>
            <li>
              <strong className="text-foreground">Supabase</strong> — hosts the
              database your preferences and matches are stored in.
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — runs the
              website itself.
            </li>
          </ul>
          <p>
            When you connect an AI provider&apos;s key, the job details being
            ranked are sent to that provider under your key, as you asked. Each
            service is bound to use the data only to provide that service. We
            will also disclose data where the law requires it.
          </p>
        </LegalSection>

        <LegalSection id="how-long" heading="How long we keep it">
          <p>
            For as long as your account exists. Deleting it removes your
            preferences, matches, keys and profile from our database. Feedback
            you sent through the site is kept, with nothing left linking it to
            you.
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
        </LegalSection>

        <LegalSection id="security" heading="Security">
          <p>
            The site is served over HTTPS, the database is reachable only by the
            application over an encrypted connection, and API keys are encrypted
            before they are stored. Passwords never reach us at all.
          </p>
          <p>
            No system is perfectly secure. If something does go wrong in a way
            that affects you, we will tell you rather than hope you do not
            notice.
          </p>
        </LegalSection>

        <LegalSection id="changes" heading="Changes to this policy">
          <p>
            Jobak is still being built, so this policy will change as it grows.
            The date at the top always reflects the current version, and
            material changes will be emailed to account holders before they take
            effect.
          </p>
        </LegalSection>
      </LegalProse>
    </PageShell>
  );
}
