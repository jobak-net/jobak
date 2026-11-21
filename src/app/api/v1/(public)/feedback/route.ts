import { getFeedbackModule } from "@/backend/modules/feedback";
import { feedbackSchema } from "@/backend/modules/feedback/validation/feedback-schema";
import { clientIp } from "@/backend/shared/http/client-ip";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { FeedbackReceipt } from "@/shared/contracts/feedback";

/**
 * POST /api/v1/feedback
 *
 * The public feedback form. Anyone may send; a signed-in sender is attributed.
 * Contract: `@/shared/contracts/feedback`.
 */
export const dynamic = "force-dynamic";

export const POST = withMiddlewares(
  { label: "feedback.submit", auth: "optional", body: feedbackSchema },
  async ({ user, body, request }): Promise<FeedbackReceipt> =>
    getFeedbackModule().submit.execute({ input: body, userId: user?.id ?? null, clientIp: clientIp(request) }),
);
