import { clientFetch, unwrap } from "@/frontend/shared/api";
import { skillVersionApiPath, type SkillVersionResponse } from "@/shared/contracts/skills";

/*************** Queries ***************/

/** The TanStack Query key for one skill version: the API path itself. */
export const skillVersionKey = (skill: string, version: string) => [skillVersionApiPath(skill, version)] as const;

/** One version's SKILL.md: `GET /api/v1/ai-tools/skills/[skill]/versions/[version]`. Throws an `ApiError`. */
export async function fetchSkillVersion(skill: string, version: string): Promise<SkillVersionResponse> {
  return unwrap(await clientFetch<SkillVersionResponse>(skillVersionApiPath(skill, version)));
}
