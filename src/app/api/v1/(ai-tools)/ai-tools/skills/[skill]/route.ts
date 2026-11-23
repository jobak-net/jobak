import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { skillParamsSchema } from "@/backend/modules/ai-tools/skills/validation/skill-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

/**
 * GET /api/v1/ai-tools/skills/[skill] — the skill and its versions, newest
 * first. Contract: `@/shared/contracts/skills`. Read from the skills
 * repository on GitHub, jobak-net/career-agent-skills.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "ai-tools.skills.list", auth: "required", params: skillParamsSchema },
  async ({ params }): Promise<SkillVersionsResponse> => getAiToolsModule().skills.list.execute(params.skill),
);
