import { getTalentModule } from "@/backend/modules/talent";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { TalentCard } from "@/shared/contracts/talent";

/**
 * GET /api/v1/talent
 *
 * The opt-in talent directory. Public: nobody is looked up. Contract:
 * `@/shared/contracts/talent`.
 *
 * Never cached (the API's default), so an unpublished card is gone on the next
 * request — any stale copy would be a withdrawn consent still being served.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "talent.list", auth: "none", rateLimit: "talent" },
  async (): Promise<TalentCard[]> => getTalentModule().listPublic.execute(),
);
