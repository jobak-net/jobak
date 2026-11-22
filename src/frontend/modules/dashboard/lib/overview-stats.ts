import type { Job } from "@/shared/contracts/jobs";

/** "Strong" from here up. */
const STRONG_SCORE = 80;

/** The overview's numbers, from the user's jobs. */
export function overviewStats(jobs: Job[]) {
  const scored = jobs.filter((job) => job.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, job) => sum + (job.score ?? 0), 0) / scored.length)
    : null;
  const strong = scored.filter((job) => (job.score ?? 0) >= STRONG_SCORE).length;
  const saved = jobs.filter((job) => job.bookmarked).length;
  const topMatches = [...jobs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).slice(0, 6);
  return { avgScore, strong, saved, topMatches };
}
