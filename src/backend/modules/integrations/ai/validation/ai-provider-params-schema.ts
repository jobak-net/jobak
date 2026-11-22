import { z } from "zod";

import { AI_PROVIDER_IDS } from "@/shared/ai";

/** The `[provider]` segment of `/api/v1/ai-settings/key/[provider]`: one of the AI provider ids. */
export const aiProviderParamsSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
});
