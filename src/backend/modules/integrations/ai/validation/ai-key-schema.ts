import { z } from "zod";

import { AI_PROVIDER_IDS, isAiModelFor } from "@/shared/ai";
import type { ConnectAiKeyRequest } from "@/shared/contracts/ai-settings";
import { KEY_MAX_LENGTH, checkKeyFormat } from "@/shared/credentials";

/**
 * The body of `PUT /api/v1/ai-settings/key`: a provider, a value shaped like
 * that provider's keys, and optionally the model to save with it (on that
 * provider's list, or null for the default).
 *
 * The key check is the one the browser ran (`checkKeyFormat`,
 * `@/shared/credentials`), run again because a browser check is never a
 * control. Whether the key *works* is the provider's call, asked by the use case.
 *
 * The issue names the rule that failed, never the value.
 */
export const aiKeySchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS),
    key: z.string().max(KEY_MAX_LENGTH * 2),
    model: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .superRefine(({ provider, key, model }, ctx) => {
    const format = checkKeyFormat(provider, key);
    if (!format.ok) ctx.addIssue({ code: "custom", path: ["key"], message: format.reason });
    if (model && !isAiModelFor(provider, model)) {
      ctx.addIssue({ code: "custom", path: ["model"], message: "Not a model on this provider's list" });
    }
  }) satisfies z.ZodType<ConnectAiKeyRequest>;
