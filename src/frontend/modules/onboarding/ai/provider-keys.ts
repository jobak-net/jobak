import { AI_PROVIDER_IDS } from "@/shared/ai";

import type { AiProvider, CredentialProvider } from "../types/onboarding.types";

/**
 * The provider lists the AI setup works from. The key shape rules themselves
 * are shared with the server (`@/shared/credentials`), and re-exported here
 * for the screens.
 */
export { checkKeyFormat, keyRules, type FormatCheck, type KeyRule } from "@/shared/credentials";

export const AI_PROVIDERS: AiProvider[] = [...AI_PROVIDER_IDS];

/** Every credential the flow collects — the four LLMs plus the scraper. */
export const CREDENTIAL_PROVIDERS: CredentialProvider[] = [...AI_PROVIDERS, "apify"];

export function isCredentialProvider(value: unknown): value is CredentialProvider {
    return typeof value === "string" && (CREDENTIAL_PROVIDERS as string[]).includes(value);
}

export function isAiProvider(value: unknown): value is AiProvider {
    return typeof value === "string" && (AI_PROVIDERS as string[]).includes(value);
}
