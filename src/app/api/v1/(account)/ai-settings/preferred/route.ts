import { getIntegrationsModule } from "@/backend/modules/integrations";
import { preferredProviderSchema } from "@/backend/modules/integrations/ai/validation/preferred-provider-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

/**
 * /api/v1/ai-settings/preferred — which saved key the AI tools use.
 * Contract: `@/shared/contracts/ai-settings`.
 */
export const dynamic = "force-dynamic";

/** PUT — `{ provider }`, one with a saved key (`ai-not-connected` otherwise). */
export const PUT = withMiddlewares(
  { label: "ai-settings.preferred", auth: "required", body: preferredProviderSchema },
  async ({ user, body }): Promise<AiSettingsResponse> => getIntegrationsModule().ai.setPreferred.execute(user.id, body),
);
