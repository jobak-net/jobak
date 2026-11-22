import { MatchesView } from "@/frontend/modules/job-search";
import { loadJobs } from "@/frontend/modules/job-search/server";

export default async function MatchesPage() {
  const { jobs, sample } = await loadJobs();
  return <MatchesView jobs={jobs} sample={sample} />;
}
