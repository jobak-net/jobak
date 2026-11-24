import { z } from "zod";

import type { JobBookmark } from "@/shared/contracts/jobs";

/** The body of `PUT /api/v1/jobs/[jobId]/bookmark`: the value to store, not a toggle. */
export const jobBookmarkSchema = z.object({
  bookmarked: z.boolean(),
}) satisfies z.ZodType<JobBookmark>;
