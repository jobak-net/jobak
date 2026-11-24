import { getIntegrationsModule } from "@/backend/modules/integrations";
import { aiKeySchema } from "@/backend/modules/integrations/ai/validation/ai-key-schema";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";

/**
 * /api/v1/ai-settings/key — connects an AI provider: checks the key with the
 * provider, then stores it encrypted. Contract: `@/shared/contracts/ai-settings`.
 */
export const dynamic = "force-dynamic";

/** PUT — `{ provider, key }`. The key never comes back; the answer says which providers are connected. */
export const PUT = withMiddlewares(
  { label: "ai-settings.key", auth: "required", rateLimit: "ai-settings.key", body: aiKeySchema },
  async ({ user, body }): Promise<AiSettingsResponse> => getIntegrationsModule().ai.connectKey.execute(user.id, body),
);
