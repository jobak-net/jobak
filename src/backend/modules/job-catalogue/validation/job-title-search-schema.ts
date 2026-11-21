import { z } from "zod";

import { MAX_QUERY_LENGTH } from "@/shared/contracts/job-catalogue";

/**
 * The query of `GET /api/v1/job-titles?q=…&field=…`.
 *
 * Shape only. Splitting `q` into words, ignoring a too-short query and capping
 * the results are the search use case's rules (`parseTitleQuery`,
 * `MAX_SEARCH_RESULTS`). The length limit here just refuses a junk query
 * before it reaches the database; a little slack over the search's own cap,
 * which trims rather than refuses.
 */
export const jobTitleSearchSchema = z.object({
  q: z.string().max(MAX_QUERY_LENGTH * 2),
  /** A field's `value`, to narrow the search to it. */
  field: z.string().max(100).optional(),
});
