import { getIntegrationsModule } from "@/backend/modules/integrations";
import { aiModelSchema } from "@/backend/modules/integrations/ai/validation/ai-model-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

/**
 * /api/v1/ai-settings — how the signed-in user's AI tools run: the model
 * picked per provider. Contract: `@/shared/contracts/ai-settings`.
 */
export const dynamic = "force-dynamic";

/** GET — the picks, and each provider's default on this server. */
export const GET = withMiddlewares(
  { label: "ai-settings.get", auth: "required" },
  async ({ user }): Promise<AiSettingsResponse> => getIntegrationsModule().ai.getSettings.execute(user.id),
);

/** PUT — one provider's model, or `null` for its default. */
export const PUT = withMiddlewares(
  { label: "ai-settings.update", auth: "required", body: aiModelSchema },
  async ({ user, body }): Promise<AiSettingsResponse> => getIntegrationsModule().ai.setModel.execute(user.id, body),
);
