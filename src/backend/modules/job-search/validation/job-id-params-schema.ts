import { z } from "zod";

/**
 * The `[jobId]` segment of `/api/v1/jobs/[jobId]/…`.
 *
 * `jobs.id` is a UUID, so anything else is refused here with a 400 instead of
 * reaching Postgres as a cast error.
 */
export const jobIdParamsSchema = z.object({
  jobId: z.uuid(),
});
