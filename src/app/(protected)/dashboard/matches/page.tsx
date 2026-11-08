import { Suspense } from "react";

import { JobList } from "@/frontend/components/dashboard/job-list";
import { PreviewNotice } from "@/frontend/components/dashboard/preview-notice";
import { PageHeader } from "@/frontend/components/ui";

import { loadJobs } from "../_lib/load-jobs";

export default async function MatchesPage() {
  const { jobs, sample } = await loadJobs();

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
