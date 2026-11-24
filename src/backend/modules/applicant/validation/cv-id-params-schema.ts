import { z } from "zod";

/** The `[id]` segment of `/api/v1/applicant/cvs/[id]`: a saved CV's id. */
export const cvIdParamsSchema = z.object({
  id: z.uuid(),
});
