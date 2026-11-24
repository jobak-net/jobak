import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";
import type { SetPreferredAiProviderRequest } from "@/shared/contracts/ai-settings";

/**
 * The body of `PUT /api/v1/ai-settings/preferred`: a provider id. Whether the
 * user has a key for it is the use case's check (`ai-not-connected`).
 */
export const preferredProviderSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
}) satisfies z.ZodType<SetPreferredAiProviderRequest>;
