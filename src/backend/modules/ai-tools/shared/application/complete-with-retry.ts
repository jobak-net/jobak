import type { AiClient, AiCompletion, AiCompletionRequest, AiProviderId } from "@/backend/modules/integrations";
import { AiProviderLimitedError } from "@/backend/shared/exceptions";

/** Builds the AI client for this user and the provider they picked (`clientForUser`, integrations module). */
export type AiClientForUser = (userId: string, provider: AiProviderId) => Promise<AiClient>;

/** When the provider throttles a call, wait this long at most for one retry. */
const MAX_RETRY_WAIT_SECONDS = 20;

/**
 * One call, retried once when the provider throttles the key and names a wait
 * of `MAX_RETRY_WAIT_SECONDS` or less: a free tier's per-minute token limit
 * (Groq's is 8,000 on GPT-OSS) clears within the minute. A longer wait, or a
 * second refusal, is thrown (`ai-provider-limited`). `label` names the tool
 * in the log.
 */
export async function completeWithRetry(ai: AiClient, request: AiCompletionRequest, label: string): Promise<AiCompletion> {
  try {
    return await ai.complete(request);
  } catch (error) {
    const wait = error instanceof AiProviderLimitedError ? (error.retryAfterSeconds ?? 8) : Infinity;
    if (wait > MAX_RETRY_WAIT_SECONDS) throw error;
    console.warn(`[${label}] ${ai.provider} throttled the call; retrying in ${wait}s`);
    await new Promise((resolve) => setTimeout(resolve, wait * 1000));
    return ai.complete(request);
  }
}
