import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JobDetailView, jobPageMetadata } from "@/frontend/modules/job-board";
import { loadJobBoardJob } from "@/frontend/modules/job-board/server";

/** One job, readable by anyone: the page the LinkedIn posts point at. */

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Rendered per request, not cached.
 *
 * The job is read per request from the API (`loadJobBoardJob`, deduplicated
 * between this page and its metadata), and the build lists this route as `ƒ`.
 * That is fine at this scale: one indexed query per view. If a LinkedIn post
 * ever makes this the hot path, caching belongs in the loader or the API, not
 * in a `revalidate` here.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return jobPageMetadata(await loadJobBoardJob(slug));
}

export default async function PublicJobPage({ params }: PageProps) {
  const { slug } = await params;
  const job = await loadJobBoardJob(slug);

  if (!job) notFound();

  return <JobDetailView job={job} />;
}
