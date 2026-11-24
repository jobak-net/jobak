import { z } from "zod";

import { APPLICANT_LIMITS as L, type UpdateApplicantNameRequest } from "@/shared/contracts/applicant";

/** The body of `PUT /api/v1/applicant/name`: the name the user writes on applications. */
export const applicantNameSchema = z.object({
  name: z.string().trim().min(1).max(L.name),
}) satisfies z.ZodType<UpdateApplicantNameRequest>;
