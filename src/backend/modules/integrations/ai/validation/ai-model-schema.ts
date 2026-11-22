import { z } from "zod";

import { AI_PROVIDER_IDS, isAiModelFor } from "@/shared/ai";
import type { UpdateAiModelRequest } from "@/shared/contracts/ai-settings";

/**
 * The body of `PUT /api/v1/ai-settings`: a provider, and a model on that
 * provider's list (`AI_MODELS`) or null for its default. A model from another
 * provider's list is refused too.
 */
export const aiModelSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS),
    model: z.string().trim().min(1).max(200).nullable(),
  })
  .refine(({ provider, model }) => model === null || isAiModelFor(provider, model), {
    message: "Not a model on this provider's list",
    path: ["model"],
  }) satisfies z.ZodType<UpdateAiModelRequest>;
