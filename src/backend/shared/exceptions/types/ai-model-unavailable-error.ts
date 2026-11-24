import { BaseError } from "../base";

/**
 * 422 — the user's AI provider says the model doesn't exist or was retired
 * (e.g. Groq's 404 `model_not_found`, or 400 `model_decommissioned`). Providers
 * retire models every few months; the user's fix is to pick another model in
 * Settings, and ours is to update `AI_MODELS` (`src/shared/ai/models.ts`).
 */
export class AiModelUnavailableError extends BaseError {
  readonly status = 422;
  readonly code = "ai-model-unavailable" as const;
}
