import { Suspense } from "react";

import { PreviewNotice } from "@/frontend/shared/components";
import { PageHeader } from "@/frontend/shared/ui";
import type { Job } from "@/shared/contracts/jobs";

import { JobList } from "../components/job-list";

/** /dashboard/matches: every job collected for the user, scored and sorted best first. */
export function MatchesView({ jobs, sample }: { jobs: Job[]; sample: boolean }) {
  return (
    <>
      <PageHeader
        title="Job matches"
        description="Every job collected for your profile, scored 0–100 and sorted best fit first."
      />
      {sample && (
        <PreviewNotice className="mb-6">
          These are sample jobs. Once your preferences are set, this list fills with real openings
          scored against your profile.
        </PreviewNotice>
      )}
      {/* Suspense: the list reads `?q=` from the URL. */}
      <Suspense>
        <JobList jobs={jobs} sample={sample} />
      </Suspense>
    </>
  );
}
