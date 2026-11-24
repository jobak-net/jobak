/**
 * The AI providers Jobak can run on — the one list, shared by both sides.
 *
 *  - The frontend shows them in onboarding and Settings, where the user picks
 *    one and pastes their key.
 *  - The backend's AI client factory (`src/backend/shared/ai/`) has exactly one
 *    integration per id: its registry is typed `Record<AiProviderId, …>`, so an
 *    id added here without an integration fails the build.
 *  - The database allows the same set (`user_preferences.ai_providers`,
 *    001_initial_schema.sql). Adding a provider means a migration too.
 *
 * Apify is not here: it collects listings, it doesn't answer prompts.
 */
export const AI_PROVIDER_IDS = ["anthropic", "openai", "gemini", "groq"] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export function isAiProviderId(value: unknown): value is AiProviderId {
  return typeof value === "string" && (AI_PROVIDER_IDS as readonly string[]).includes(value);
}
