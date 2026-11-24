import type { Metadata } from "next";

import { isProductionSite } from "@/frontend/shared/config";
import type { PublicJob } from "@/shared/contracts/job-board";

/**
 * One job's metadata. This is the page the LinkedIn posts point at, and
 * LinkedIn renders the link preview from these tags — a card that says
 * "Jobak" with no title gets scrolled past.
 */
export function jobPageMetadata(job: PublicJob | null): Metadata {
  if (!job) return { title: "Job not found — Jobak" };

  const where = [job.location, job.workplace === "remote" ? "Remote" : null]
    .filter(Boolean)
    .join(" · ");

  const title = `${job.title} at ${job.company}`;
  /*
   * Built from fields rather than from the description: LinkedIn truncates the
   * preview at roughly 100 characters, and the first line of a job description
   * is almost always boilerplate about the company.
   */
  const description = [where, job.salary, "Apply via Jobak"].filter(Boolean).join(" · ");

  return {
    title: `${title} — Jobak`,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/jobs/${job.slug}`,
      siteName: "Jobak",
    },
    twitter: { card: "summary_large_image", title, description },
    // Preview deployments stay out of the index; the shared metadata helper
    // makes the same call for every other page.
    robots: isProductionSite ? { index: true, follow: true } : { index: false, follow: false },
  };
}
