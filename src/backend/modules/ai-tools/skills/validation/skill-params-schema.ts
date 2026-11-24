import { z } from "zod";

import { SKILL_NAME_PATTERN, SKILL_VERSION_PATTERN } from "@/shared/contracts/skills";

/**
 * The `[skill]` (and `[version]`) segments of `/api/v1/ai-tools/skills/…`.
 * Strict on purpose: they become file paths, so anything but a lowercase slug
 * and an `x.y.z` version is refused here with a 400.
 */
export const skillParamsSchema = z.object({
  skill: z.string().regex(SKILL_NAME_PATTERN).max(64),
});

export const skillVersionParamsSchema = skillParamsSchema.extend({
  version: z.string().regex(SKILL_VERSION_PATTERN),
});
