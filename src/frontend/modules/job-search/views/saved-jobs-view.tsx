import { Suspense } from "react";

import { PreviewNotice } from "@/frontend/shared/components";
import { PageHeader } from "@/frontend/shared/ui";
import type { Job } from "@/shared/contracts/jobs";

import { JobList } from "../components/job-list";

/** /dashboard/saved: the matches the user bookmarked. */
export function SavedJobsView({ jobs, sample }: { jobs: Job[]; sample: boolean }) {
  return (
    <>
      <PageHeader
        title="Saved jobs"
        description="The matches you bookmarked, kept until you remove them."
      />
      {sample && <PreviewNotice className="mb-6">These are sample jobs, bookmarked to show how this page works.</PreviewNotice>}
      <Suspense>
        <JobList jobs={jobs} sample={sample} initialFilter="saved" lockFilter />
      </Suspense>
    </>
  );
}
