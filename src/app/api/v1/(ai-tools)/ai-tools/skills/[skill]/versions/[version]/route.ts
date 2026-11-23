import { getAiToolsModule } from "@/backend/modules/ai-tools";
import { skillVersionParamsSchema } from "@/backend/modules/ai-tools/skills/validation/skill-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { SkillVersionResponse } from "@/shared/contracts/skills";

/**
 * GET /api/v1/ai-tools/skills/[skill]/versions/[version] — one version's
 * SKILL.md. Released versions never change (the skills repository's
 * README), so the browser caches them for good. Contract: `@/shared/contracts/skills`.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "ai-tools.skills.get", auth: "required", params: skillVersionParamsSchema },
  async ({ params }): Promise<SkillVersionResponse> =>
    getAiToolsModule().skills.get.execute(params.skill, params.version),
);
