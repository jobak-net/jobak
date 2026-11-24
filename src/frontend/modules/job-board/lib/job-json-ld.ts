import type { PublicJob, PublicJobCard } from "@/shared/contracts/job-board";

/**
 * The board's results as an `ItemList` — the same structure this service
 * reads from Bayt and Talent.com to discover their listings. Publishing it
 * makes the page legible to the aggregators that come looking.
 */
export function jobBoardJsonLd(jobs: PublicJobCard[], total: number, offset: number) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest jobs on Jobak",
    numberOfItems: total,
    // Positions continue across pages — page 2 starts at 25, not back at 1.
    itemListElement: jobs.map((job, index) => ({
      "@type": "ListItem",
      position: offset + index + 1,
      url: `/jobs/${job.slug}`,
      name: `${job.title} at ${job.company}`,
    })),
  };
}

/**
 * One job as a schema.org `JobPosting`, for the same reason this service
 * *reads* it from other boards: it is the contract search engines and
 * aggregators understand. A page that consumes structured data and publishes
 * none would be taking without giving.
 */
export function jobPostingJsonLd(job: PublicJob) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || job.title,
    datePosted: job.postedAt,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
      ...(job.companyWebsite ? { sameAs: job.companyWebsite } : {}),
    },
    ...(job.workplace === "remote" ? { jobLocationType: "TELECOMMUTE" } : {}),
    ...(job.location
      ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location } } }
      : {}),
    directApply: false,
  };
}
