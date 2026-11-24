import type { Metadata } from "next";

import { JobBoardView, PAGE_SIZE, jobBoardMetadata, readBoardView, type BoardSearchParams } from "@/frontend/modules/job-board";
import { loadJobBoard } from "@/frontend/modules/job-board/server";

/** The public jobs board. What it shows, and why, is `JobBoardView`. */

interface PageProps {
  searchParams: Promise<BoardSearchParams>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return jobBoardMetadata(await searchParams);
}

export default async function PublicJobsPage({ searchParams }: PageProps) {
  const view = readBoardView(await searchParams);
  const { jobs, total } = await loadJobBoard({
    region: view.region,
    workplace: view.workplace,
    q: view.search,
    category: view.category,
    limit: PAGE_SIZE,
    page: view.page,
  });

  return <JobBoardView view={view} jobs={jobs} total={total} />;
}
