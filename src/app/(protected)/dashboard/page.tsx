import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { requireUser } from "@/backend/modules/auth/interface";
import { ActivityChart, StageBars } from "@/frontend/components/dashboard/charts";
import { Contribute } from "@/frontend/components/dashboard/contribute";
import { JobRow } from "@/frontend/components/dashboard/job-row";
import { AiTools } from "@/frontend/components/dashboard/overview/ai-tools";
import { GettingStarted } from "@/frontend/components/dashboard/overview/getting-started";
import { PreviewNotice } from "@/frontend/components/dashboard/preview-notice";
import { StatStrip } from "@/frontend/components/dashboard/stat-strip";
import { Button } from "@/frontend/components/ui";
import { APPLICATION_STAGES, MATCH_ACTIVITY, SAMPLE_APPLICATIONS } from "@/frontend/lib/mocks/dashboard";

import { loadJobs } from "./_lib/load-jobs";

/** A rail section's heading, with an optional "sample" marker and link. */
function RailHeading({ title, sample, href, linkLabel }: { title: string; sample?: boolean; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">
        {title}
        {sample && <span className="ml-2 text-xs font-normal text-fg-quaternary">sample</span>}
      </h2>
      {href && (
        <Link href={href} className="text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/**
 * The page everyone lands on after signing in.
 *
 * Built around the one thing the product is for, the matches: they get the
 * main column and the only raised surface on the page. Everything else (the
 * numbers, activity, applications, tools) sits flat beside it, separated by
 * space and hairlines rather than boxed into cards of equal weight.
 *
 * Real where the data exists — matches, scores and bookmarks come from the
 * user's own jobs — and sample where the feature behind it does not exist yet.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  // Onboarding is done by the time anyone gets here — the layout sends
  // everyone else to /onboarding — so what varies is whether matches exist yet.
  const { jobs, sample } = await loadJobs();

  const scored = jobs.filter((job) => job.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, job) => sum + (job.score ?? 0), 0) / scored.length)
    : null;
  const strong = scored.filter((job) => (job.score ?? 0) >= 80).length;
  const saved = jobs.filter((job) => job.bookmarked).length;
  const topMatches = [...jobs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 6);

  const stages = APPLICATION_STAGES.map((stage) => ({
    label: stage.label,
    color: stage.color,
    count: SAMPLE_APPLICATIONS.filter((application) => application.stage === stage.id).length,
  }));

  const firstName = user.fullName?.split(/\s+/)[0] ?? null;

  return (
    <div className="space-y-10">
      <header className="dash-enter flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-fg-primary">
            {sample ? "Welcome to Jobak" : "Welcome back"}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-fg-tertiary">
            {strong > 0
              ? `${strong} strong ${strong === 1 ? "match" : "matches"} waiting for you.`
              : "Your matches will appear here as Jobak finds them."}
          </p>
        </div>
        <Button variant="primary" asChild>
          <Link href="/dashboard/matches">
            Review matches
            <ArrowRight />
          </Link>
        </Button>
      </header>

      {/* Until the first real matches arrive: what to do while Jobak searches. */}
      {sample && <GettingStarted />}

      <div className="space-y-3">
        <StatStrip
          items={[
            { label: "Job matches", value: jobs.length },
            {
              label: "Average match",
              value: avgScore === null ? "–" : `${avgScore}%`,
              note: strong ? `${strong} strong` : undefined,
              positive: strong > 0,
            },
            { label: "Saved jobs", value: saved },
            { label: "Applications", value: SAMPLE_APPLICATIONS.length, note: "sample" },
          ]}
        />
        {sample && (
          <PreviewNotice>
            These are sample jobs. Set your preferences and Jobak replaces them with real matches scored for you.
          </PreviewNotice>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="dash-enter rounded-card border border-border-subtle bg-(image:--surface-1) p-5 sm:p-6">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-fg-primary">Top matches</h2>
            <Link href="/dashboard/matches" className="text-[13px] text-fg-tertiary transition-colors hover:text-fg-primary">
              View all
            </Link>
          </div>
          <div className="-mx-3 divide-y divide-border-subtle">
            {topMatches.map((job, i) => (
              <JobRow key={job.id} job={job} index={i} />
            ))}
          </div>
        </section>

        <aside className="space-y-9">
          <section>
            <RailHeading title="Match activity" sample />
            <ActivityChart data={MATCH_ACTIVITY} className="h-36" />
            <p className="mt-3 flex gap-4 text-xs text-fg-tertiary">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-white/20" /> New matches
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-score-high" /> Scored 80+
              </span>
            </p>
          </section>

          <section className="border-t border-border-subtle pt-8">
            <RailHeading title="Applications" sample href="/dashboard/applications" linkLabel="Open tracker" />
            <StageBars stages={stages} />
          </section>

          <section className="border-t border-border-subtle pt-8">
            <RailHeading title="AI tools" />
            <AiTools />
          </section>

          <div className="border-t border-border-subtle pt-8">
            <Contribute />
          </div>
        </aside>
      </div>
    </div>
  );
}
