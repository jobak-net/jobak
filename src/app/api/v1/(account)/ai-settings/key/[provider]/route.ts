import { getIntegrationsModule } from "@/backend/modules/integrations";
import { aiProviderParamsSchema } from "@/backend/modules/integrations/ai/validation/ai-provider-params-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

/**
 * /api/v1/ai-settings/key/[provider] — one provider's saved key.
 * Contract: `@/shared/contracts/ai-settings`.
 */
export const dynamic = "force-dynamic";

/** DELETE — forgets the key. The next connected provider, if any, becomes preferred. */
export const DELETE = withMiddlewares(
  { label: "ai-settings.key.remove", auth: "required", params: aiProviderParamsSchema },
  async ({ user, params }): Promise<AiSettingsResponse> =>
    getIntegrationsModule().ai.removeKey.execute(user.id, params.provider),
);
