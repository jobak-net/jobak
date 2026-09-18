import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalProse,
  LegalSection,
  LegalUpdated,
} from "@/frontend/components/public/legal/legal-prose";
import { PageIntro, PageShell } from "@/frontend/components/public/shared/page-intro";

/**
 * Terms of service.
 *
 * Deliberately short and specific. Jobak is pre-launch: there is no account, no
 * payment and no service to guarantee, so terms written for a running product
 * would be making promises about something that does not exist yet.
 */
export const metadata: Metadata = {
  title: "Terms of Service — Jobak",
  description:
    "The terms you agree to by using the Jobak website and joining the waitlist.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Legal"
        title={
          <>
            Terms of
            <br />
            <span className="text-muted-foreground">service.</span>
          </>
        }
        lead="Short, because there is not much to agree to yet — Jobak is not open, there is nothing to pay for, and no account to hold."
      />

      <LegalUpdated date="19 September 2026" />

      <LegalProse>
        <LegalSection id="scope" heading="What these terms cover">
          <p>
            Using this website — browsing the job listings, or joining the
            waitlist — means you accept what is written here. If you do not, the
            remedy is simply not to use it.
          </p>
          <p>
            When Jobak opens properly, these terms will be replaced with ones
            covering accounts, matching and anything payable. Nobody on the
            waitlist will be charged under the terms on this page, because there
            is nothing on it to charge for.
          </p>
        </LegalSection>

        <LegalSection id="waitlist" heading="The waitlist">
          <p>
            Joining puts your email address on a list to be told when Jobak
            opens. It is not a purchase, not a reservation, and not a promise of
            access — we may invite people in stages, or in an order that is not
            strictly first-come.
          </p>
          <p>
            We may also never launch. That is the honest position for a product
            being built by one person, and you should not rely on Jobak existing
            when deciding anything about your career.
          </p>
        </LegalSection>

        <LegalSection id="listings" heading="The job listings">
          <p>
            The{" "}
            <Link href="/jobs" className="text-accent-text underline underline-offset-2">
              listings
            </Link>{" "}
            are collected automatically from public sources and shown with a link
            to where each was published. We do not write them, verify them, or
            have any relationship with the employers posting them.
          </p>
          <p>
            That means a listing may be out of date, inaccurate, already filled,
            or — despite the filtering we do — fraudulent. Treat what you find
            here as a pointer to the original posting, and apply the same care
            you would on any job board:{" "}
            <strong className="text-foreground">
              no legitimate employer asks you to pay to apply
            </strong>
            .
          </p>
          <p>
            If you are an employer and would rather your listing were not shown,
            email us and it will be removed.
          </p>
        </LegalSection>

        <LegalSection id="acceptable-use" heading="Using the site">
          <p>Please do not:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              submit addresses that are not yours, or use the form to send
              unwanted mail to someone else
            </li>
            <li>
              scrape the listings wholesale — they are not ours to re-license,
              and the sources they came from have their own terms
            </li>
            <li>
              attempt to break, overload or find a way into parts of the site
              that are not public
            </li>
          </ul>
          <p>
            We rate-limit the forms for exactly these reasons. Hitting a limit
            during ordinary use is a bug on our side — tell us and we will widen
            it.
          </p>
        </LegalSection>

        <LegalSection id="ip" heading="Who owns what">
          <p>
            The Jobak name, logo, design and code are ours. The job listings are
            not — they remain the property of whoever published them, and appear
            here as references to their original source.
          </p>
        </LegalSection>

        <LegalSection id="no-warranty" heading="No guarantees">
          <p>
            The site is provided as it is. We do not promise it will be
            available, correct, or free of faults, and we are not liable for
            decisions made on the strength of a listing shown here — including a
            job that turns out not to exist.
          </p>
          <p>
            This does not limit anything that cannot be limited by law, such as
            liability for our own fraud.
          </p>
        </LegalSection>

        <LegalSection id="changes" heading="Changes">
          <p>
            These terms will change as Jobak is built. The date at the top shows
            the current version, and material changes will be emailed to anyone
            on the waitlist before they take effect.
          </p>
        </LegalSection>

        <LegalSection id="contact" heading="Contact">
          <p>
            Questions about any of this go to{" "}
            <a
              href="mailto:hello@jobak.net"
              className="text-accent-text underline underline-offset-2"
            >
              hello@jobak.net
            </a>
            . See also the{" "}
            <Link href="/privacy" className="text-accent-text underline underline-offset-2">
              privacy policy
            </Link>
            .
          </p>
        </LegalSection>
      </LegalProse>
    </PageShell>
  );
}
