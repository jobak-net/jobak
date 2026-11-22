import { sanitizeDescription } from "@/backend/shared/html";
import type { Job, Workplace } from "@/shared/contracts/jobs";

import type { JobPoolRepository, UserMatch } from "../domain/job-pool.repository";
import type { PreferencesReader } from "../domain/preferences-reader";

/**
 * How much of the pool to consider before narrowing by title in memory.
 *
 * Title matching stays out of the query on purpose: it's word-based ("Senior
 * Backend Engineer, Payments" is a "backend engineer"), and the catalogue is
 * full of punctuation ("Mobile Engineer (iOS)"). So the database narrows on
 * what it can index — active, work arrangement, region — and the titles are
 * matched here.
 */
const POOL_WINDOW = 400;

/** What the dashboard will show after narrowing. */
const MAX_RESULTS = 100;

/** Preferences spell it "on-site"; `jobs.job_type` does not. */
const WORKPLACE_BY_PREFERENCE: Record<string, string> = {
  remote: "remote",
  "on-site": "onsite",
  hybrid: "hybrid",
};

/**
 * The jobs worth showing a user, from the shared pool — `GET /api/v1/jobs`.
 *
 * Reads the pool rather than only the user's matches, because collection and
 * scoring are separate: the collectors fill the pool continuously, and the
 * matcher scores it per user afterwards. Waiting for a score to show anything
 * meant a new user stared at an empty dashboard for the length of a scoring run.
 *
 * A score is attached where one exists and left as "not scored" where it does
 * not, so matched jobs sort to the top and unscored ones are visible underneath
 * instead of hidden.
 *
 * Empty until the user has preferences: there is nothing to narrow the pool by.
 */
export class ListUserJobsUseCase {
  constructor(
    private readonly preferences: PreferencesReader,
    private readonly jobs: JobPoolRepository,
  ) {}

  async execute(userId: string): Promise<Job[]> {
    const prefs = await this.preferences.get(userId);
    const titles = (prefs?.jobTitles ?? []).filter(Boolean);

    // Without a profile there is nothing to narrow by, and showing the entire
    // pool would be noise rather than a dashboard.
    if (!prefs || titles.length === 0) return [];

    const [pool, matches] = await Promise.all([
      this.jobs.pool({
        workplaces: prefs.workModes.map((mode) => WORKPLACE_BY_PREFERENCE[mode]).filter(Boolean),
        // Geography only when the user named somewhere.
        countries: prefs.location.worldwide ? [] : prefs.location.countries.filter(Boolean),
        limit: POOL_WINDOW,
      }),
      this.jobs.matches(userId),
    ]);

    const matchByJob = new Map<string, UserMatch>(matches.map((m) => [m.jobId, m]));
    const wanted = titles.map(normalise);

    return pool
      .filter((job) => wanted.some((title) => titleMatches(normalise(job.title), title)))
      .map((job) => {
        const match = matchByJob.get(job.id);
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location ?? "",
          // The pool stores workplace type; contract type is not collected, so
          // it is not invented here either.
          type: "full-time",
          workplace: toWorkplace(job.jobType ?? ""),
          salary: job.salary || "—",
          // null means "not scored yet", not "scored zero".
          score: match?.score ?? null,
          /*
           * Source names come from the table rather than a constant: a hardcoded
           * id map drifted out of step with the rows that exist. "Other" means
           * the row is genuinely missing.
           */
          source: job.source || "Other",
          link: job.applyUrl,
          postedAt: formatDate(job.postedAt),
          bookmarked: match?.bookmarked ?? false,
          remote: job.jobType === "remote",
          /*
           * The model's read on the stack beats the source's: most boards publish
           * no tech stack at all, and `jobs.tech_stack` is empty on nearly every
           * row as a result.
           */
          tags: match?.techStack.length ? match.techStack : job.techStack,
          description: sanitizeDescription(job.description),
          /*
           * The scorer has always been asked for this and the workflow always
           * threw it away, so "Why it matches your CV" had nothing to render.
           */
          matchReasons: match?.reason ? [match.reason] : undefined,
        } satisfies Job;
      })
      /*
       * Scored jobs first, best first; unscored underneath in pool order rather
       * than mixed in at an implied zero.
       */
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, MAX_RESULTS);
  }
}

/** Lowercase, punctuation stripped, so "Mobile Engineer (iOS)" can match "mobile engineer ios". */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a posting's title is the role the user asked for.
 *
 * Substring alone is too narrow — "Senior Backend Engineer, Payments" does not
 * contain "backend engineer" as a phrase once punctuation is stripped, but it is
 * plainly the same job. Requiring every significant word of the target instead
 * keeps that match and still rejects "Engineering Manager".
 */
function titleMatches(jobTitle: string, target: string): boolean {
  if (!target) return false;
  if (jobTitle.includes(target)) return true;

  const words = target.split(" ").filter((w) => w.length > 2);
  return words.length > 0 && words.every((word) => jobTitle.includes(word));
}

/**
 * `jobs.job_type` is the workplace arrangement, not the contract type.
 *
 * The previous mapping collapsed remote / onsite / hybrid all to "full-time",
 * which threw away the only geography signal the card had and told the user
 * something the posting never said.
 */
function toWorkplace(raw: string): Workplace {
  return raw === "remote" || raw === "hybrid" ? raw : "onsite";
}

/** Relative for the first week, then an absolute date. */
function formatDate(iso: string | null): string {
  if (!iso) return "Recently";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recently";

  const hours = Math.floor((Date.now() - date.getTime()) / 36e5);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
