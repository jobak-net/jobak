import Link from "next/link";
import { ArrowUpRight, Banknote, Building2, Clock, MapPin, Wifi } from "lucide-react";

import { AudienceSwitch } from "@/frontend/modules/marketing";
import { JsonLd } from "@/frontend/shared/components";
import { LinkedInIcon } from "@/frontend/shared/ui";
import type { PublicJob } from "@/shared/contracts/job-board";
import { DASHBOARD_HREF, REFERRALS_HREF, SIGN_UP_HREF } from "@/shared/routes";

import { Pill } from "../components/pill";
import { formatPostedAt } from "../lib/format-posted-at";
import { jobPostingJsonLd } from "../lib/job-json-ld";

/**
 * One job, readable by anyone.
 *
 * This is the page the LinkedIn posts point at, which decides two things about
 * how it is built:
 *
 *  - **The metadata matters as much as the page.** LinkedIn renders a link
 *    preview from Open Graph tags, and a post whose card says "Jobak" with no
 *    title gets scrolled past. `generateMetadata` below is the actual product
 *    here.
 *  - **It must render for a signed-out visitor**, so nothing on it may touch a
 *    per-user table. Scores and bookmarks live on `user_job_matches` and are
 *    deliberately absent.
 */
export function JobDetailView({ job }: { job: PublicJob }) {
  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay">
      {/*
        `title`, `company` and `description` come from scraped third-party
        boards — anyone who can post a listing controls those strings — so this
        goes through `JsonLd`, which escapes the sequences that can close a
        script element. An earlier comment here claimed these were values we
        control. They are not.
      */}
      <JsonLd data={jobPostingJsonLd(job)} />

      <section className="relative pt-40 pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-12">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground mb-8"
          >
            <span className="w-8 h-px bg-foreground/30" />
            All jobs
          </Link>

          <h1 className="text-3xl lg:text-5xl font-display tracking-tight leading-[1.08] mb-4">
            {job.title}
          </h1>

          <p className="text-xl text-muted-foreground mb-8">{job.company}</p>

          <div className="flex flex-wrap gap-2 mb-10">
            {/*
              Guarded: `jobs.location` held the literal "[object Object]" for
              sources that publish a structured location, and repaired rows are
              blank. See db/supabase/013_repair_job_data.sql.
            */}
            {job.location && <Pill icon={MapPin}>{job.location}</Pill>}
            <Pill icon={job.workplace === "remote" ? Wifi : Building2} accent={job.workplace === "remote"}>
              {job.workplace === "onsite" ? "On-site" : job.workplace === "hybrid" ? "Hybrid" : "Remote"}
            </Pill>
            {job.salary && <Pill icon={Banknote}>{job.salary}</Pill>}
            <Pill icon={Clock}>{formatPostedAt(job.postedAt)}</Pill>
            {job.source && <Pill>via {job.source}</Pill>}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-12">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-(--bg-canvas) font-semibold text-sm hover:bg-accent-bright transition-all"
            >
              Apply
              <ArrowUpRight className="w-4 h-4" />
            </a>

            {/*
              The employer's own front door, when enrichment resolved it. This is
              the payoff of the company-links work: an aggregator's apply button
              is a redirect, and these are the real thing.
            */}
            {job.companyCareers && (
              <a
                href={job.companyCareers}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border-standard text-sm hover:border-foreground/40 transition-all"
              >
                <Building2 className="w-4 h-4" />
                All roles at {job.company}
              </a>
            )}

            {job.companyLinkedin && (
              <a
                href={job.companyLinkedin}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border-standard text-sm hover:border-foreground/40 transition-all"
                aria-label={`${job.company} on LinkedIn`}
              >
                <LinkedInIcon className="w-4 h-4" />
                LinkedIn
              </a>
            )}
          </div>

          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg text-xs bg-accent/8 border border-accent/20 text-accent-text"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {job.description ? (
            <article
              className="max-w-none text-[15px] leading-relaxed text-muted-foreground
                         [&_p]:my-4
                         [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4 [&_ul]:space-y-1.5
                         [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4 [&_ol]:space-y-1.5
                         [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-2
                         [&_h4]:text-foreground [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2
                         [&_strong]:text-foreground [&_b]:text-foreground
                         [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-words
                         [&_blockquote]:border-l-2 [&_blockquote]:border-border-standard [&_blockquote]:pl-4 [&_blockquote]:italic"
              // Sanitised server-side by the job board module
              // (`GetJobBoardJobUseCase`) before it reaches this page.
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          ) : (
            <div className="rounded-2xl border border-border-standard bg-white/2 p-6">
              <p className="text-muted-foreground">
                {job.source ? `${job.source} lists this role without a description.` : "No description was collected for this role."}{" "}
                The full posting is on the original listing.
              </p>
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 mt-4 text-sm text-accent underline underline-offset-2"
              >
                Read the full posting
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="mt-16 pt-8 border-t border-border-subtle">
            <p className="text-sm text-muted-foreground">
              Jobak collects openings from MENA boards, remote job boards and companies&apos; own
              career pages, then scores them against your profile.{" "}
              {/* The pitch changes with the reader: an account holder is not told to sign up. */}
              <AudienceSwitch
                signedOut={
                  <>
                    <Link href={SIGN_UP_HREF} className="text-accent underline underline-offset-2">
                      Create a free account
                    </Link>{" "}
                    to get matches like this one.
                  </>
                }
                signedIn={
                  <>
                    Know someone who&apos;d want this job?{" "}
                    <Link href={REFERRALS_HREF} className="text-accent underline underline-offset-2">
                      Refer a friend
                    </Link>
                    .
                  </>
                }
                local={
                  <>
                    <Link href={DASHBOARD_HREF} className="text-accent underline underline-offset-2">
                      Open your dashboard
                    </Link>{" "}
                    to see how it scores for you.
                  </>
                }
              />
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
