import { z } from "zod";

import {
  FEEDBACK_CATEGORY_VALUES,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
  type FeedbackRequest,
} from "@/shared/contracts/feedback";

/**
 * The body of `POST /api/v1/feedback`.
 *
 * The message is trimmed before its length is checked, as the database does.
 * The optional fields only get a ceiling here, to refuse junk: what to keep of
 * them (a plausible email, a short page path) is the use case's call.
 */
export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORY_VALUES),
  message: z.string().trim().min(FEEDBACK_MESSAGE_MIN).max(FEEDBACK_MESSAGE_MAX),
  email: z.string().max(1000).optional(),
  pagePath: z.string().max(2000).optional(),
  website: z.string().max(1000).optional(),
  openedAt: z.number().optional(),
}) satisfies z.ZodType<FeedbackRequest>;
