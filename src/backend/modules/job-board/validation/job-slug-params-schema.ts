import { z } from "zod";

/** The `[slug]` segment of `/api/v1/job-board/[slug]`. */
export const jobSlugParamsSchema = z.object({
  slug: z.string().min(1).max(300),
});
