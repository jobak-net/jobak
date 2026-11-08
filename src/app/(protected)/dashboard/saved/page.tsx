import { Suspense } from "react";

import { JobList } from "@/frontend/components/dashboard/job-list";
import { PreviewNotice } from "@/frontend/components/dashboard/preview-notice";
import { PageHeader } from "@/frontend/components/ui";

import { loadJobs } from "../_lib/load-jobs";

export default async function SavedPage() {
  const { jobs, sample } = await loadJobs();

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
