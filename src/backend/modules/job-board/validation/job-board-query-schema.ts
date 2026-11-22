import { z } from "zod";

import {
  JOB_BOARD_DEFAULT_PAGE_SIZE,
  JOB_BOARD_MAX_PAGE_SIZE,
  REGION_FILTERS,
  WORKPLACE_FILTERS,
  type JobBoardQuery,
} from "@/shared/contracts/job-board";
import { JOB_CATEGORIES } from "@/shared/job-categories";

const CATEGORY_VALUES = ["all", ...JOB_CATEGORIES.map((c) => c.value)] as [string, ...string[]];

/**
 * The query of `GET /api/v1/job-board`. Every field has the board's default,
 * so no query at all is the default view. An unknown value is a 400 — the
 * pages normalise what they read from their own URL before asking.
 *
 * `q` gets a generous ceiling to refuse junk; the use case cuts it to
 * `JOB_BOARD_SEARCH_MAX`.
 */
export const jobBoardQuerySchema = z.object({
  region: z.enum(REGION_FILTERS).default("mena"),
  workplace: z.enum(WORKPLACE_FILTERS).default("all"),
  q: z.string().max(500).default(""),
  category: z.enum(CATEGORY_VALUES).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(JOB_BOARD_MAX_PAGE_SIZE).default(JOB_BOARD_DEFAULT_PAGE_SIZE),
}) satisfies z.ZodType<Required<JobBoardQuery>>;
