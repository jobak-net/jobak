import {
  JOB_BOARD_DEFAULT_PAGE_SIZE,
  type RegionFilter,
  type WorkplaceFilter,
} from "@/shared/contracts/job-board";
import { JOB_CATEGORIES } from "@/shared/job-categories";

/*
 * The board's URL: what each filter can be, reading it back from
 * `searchParams`, and building the link for a filter change. Filters are
 * links, not state — every combination is a real, crawlable URL.
 */

/**
 * Divisible by both grid widths (2 and 3 columns), so the last row of a full
 * page is never a lone card hanging off the left.
 */
export const PAGE_SIZE = JOB_BOARD_DEFAULT_PAGE_SIZE;

export const REGIONS: { value: RegionFilter; label: string }[] = [
  { value: "mena", label: "MENA" },
  { value: "remote", label: "Remote" },
  { value: "all", label: "Everywhere" },
];

export const WORKPLACES: { value: WorkplaceFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export function readRegion(value: string | undefined): RegionFilter {
  return value === "remote" || value === "all" ? value : "mena";
}

export function readWorkplace(value: string | undefined): WorkplaceFilter {
  return value === "remote" || value === "hybrid" || value === "onsite" ? value : "all";
}

/** Unrecognised values fall back to "all" rather than returning nothing. */
export function readCategory(value: string | undefined): string {
  return value && JOB_CATEGORIES.some((c) => c.value === value) ? value : "all";
}

/** `?page=0`, `?page=-3` and `?page=banana` all mean page one. */
export function readPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

export const CATEGORY_OPTIONS = [
  { value: "all", label: "All" },
  ...JOB_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

/**
 * Only the non-default parts, so the canonical `/jobs` stays clean.
 *
 * `page` is deliberately opt-in: the filter and search links never pass it, so
 * changing any filter drops you back to page one rather than onto page 7 of a
 * result set that may only have two.
 */
export function hrefFor(next: {
  region?: RegionFilter;
  workplace?: WorkplaceFilter;
  q?: string;
  category?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (next.region && next.region !== "mena") params.set("region", next.region);
  if (next.workplace && next.workplace !== "all") params.set("workplace", next.workplace);
  if (next.category && next.category !== "all") params.set("category", next.category);
  if (next.q) params.set("q", next.q);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/jobs?${query}` : "/jobs";
}
