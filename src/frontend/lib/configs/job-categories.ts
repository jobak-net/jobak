/**
 * Job categories, derived from the title.
 *
 * ── Why the title and not a column ──────────────────────────
 * `jobs` has `tech_stack` and `seniority` columns, and both are empty on every
 * one of the ~3,900 active listings — the collector never populated them. A
 * filter reading either would show nothing at all.
 *
 * The titles, by contrast, are rich and specific ("Senior Privacy Engineer",
 * "Sr. Customer Engagement Marketing Manager"), so that is where the signal
 * actually is. Matching keywords against them is imprecise — a title can miss
 * its category, and an unusual one lands nowhere — but it works today on real
 * data rather than waiting on a classifier and a backfill.
 *
 * When the collector does start classifying jobs properly, this becomes a
 * fallback for old rows rather than the primary mechanism.
 *
 * ── Ordering matters ────────────────────────────────────────
 * A job matches the first category whose keywords hit, so the more specific
 * ones come first: "Marketing Engineer" should read as Engineering, and
 * "Sales Engineer" likewise, which is why Engineering precedes both.
 */

export interface JobCategory {
  value: string;
  label: string;
  /**
   * Matched case-insensitively as SUBSTRINGS of the title.
   *
   * That is the important constraint: every keyword here must be long and
   * distinctive enough that it cannot appear inside an unrelated word. Short
   * ones are the trap — "ux" matches "Lin**ux**", "ui" matches "B**ui**lder",
   * "ai" matches "**AI**" but also "Retail" and "Chain".
   *
   * An earlier version tried to guard those with a trailing space ("ui "), but
   * the term is trimmed before it reaches the query, so the guard was silently
   * removed and "Embedded Linux Software Engineer" was filed under Design.
   *
   * So: no keyword shorter than four characters, and none that is a common
   * fragment of a longer word. Missing a few listings is much better than
   * filing them under the wrong heading — a category people cannot trust is
   * worse than one that is merely incomplete.
   */
  keywords: readonly string[];
}

export const JOB_CATEGORIES: readonly JobCategory[] = [
  {
    value: "engineering",
    label: "Engineering",
    keywords: [
      "engineer", "developer", "programmer", "backend", "back-end",
      "frontend", "front-end", "fullstack", "full-stack", "software",
      "devops", "architect", "sdet", "mobile", "android", "platform",
      "infrastructure", "security", "site reliability",
      /*
       * "sre", "qa" and "ios" were dropped rather than kept: they collide
       * inside ordinary words — "disregard", "Qatar", "Studios" — and "Qatar"
       * in particular would misfile a large share of a MENA board's listings.
       * Roles that use only those abbreviations are missed, which is the
       * cheaper error.
       */
    ],
  },
  {
    value: "data",
    label: "Data & AI",
    keywords: [
      "data", "machine learning", "analytics", "analyst", "scientist",
      "business intelligence", "deep learning", "artificial intelligence",
    ],
  },
  {
    value: "design",
    label: "Design",
    keywords: [
      "design", "ux/ui", "ui/ux", "user experience", "user interface",
      "graphic", "creative director", "brand",
    ],
  },
  {
    value: "product",
    label: "Product",
    keywords: ["product manager", "product owner", "product lead", "scrum", "agile"],
  },
  {
    value: "marketing",
    label: "Marketing",
    keywords: [
      "marketing", "content", "social media", "growth", "copywriter",
      "communications", "public relations", "brand manager",
    ],
  },
  {
    value: "sales",
    label: "Sales",
    keywords: [
      "sales", "account executive", "account manager", "business development",
      "partnerships", "revenue",
    ],
  },
  {
    value: "support",
    label: "Support",
    keywords: [
      "support", "customer success", "customer service", "help desk",
      "helpdesk", "technical support",
    ],
  },
  {
    value: "finance",
    label: "Finance",
    keywords: [
      "finance", "financial", "accountant", "accounting", "audit",
      "controller", "treasury", "payroll",
    ],
  },
  {
    value: "operations",
    label: "Operations",
    keywords: [
      "operations", "logistics", "supply chain", "procurement",
      "project manager", "program manager", "human resources",
      "recruiter", "recruiting", "talent acquisition", "people operations",
    ],
  },
] as const;

export type JobCategoryValue = (typeof JOB_CATEGORIES)[number]["value"] | "all";

/** The keywords for a category, or null for "all" / anything unrecognised. */
export function categoryKeywords(value: string): readonly string[] | null {
  if (value === "all") return null;
  return JOB_CATEGORIES.find((c) => c.value === value)?.keywords ?? null;
}

export function categoryLabel(value: string): string | null {
  return JOB_CATEGORIES.find((c) => c.value === value)?.label ?? null;
}
