import { SavedJobsView } from "@/frontend/modules/job-search";
import { loadJobs } from "@/frontend/modules/job-search/server";

export default async function SavedPage() {
  const { jobs, sample } = await loadJobs();
  return <SavedJobsView jobs={jobs} sample={sample} />;
}
