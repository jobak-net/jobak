import "server-only";

import {
  AiKeyRejectedError,
  AiProviderLimitedError,
  InternalServerError,
  ServiceUnavailableError,
} from "@/backend/shared/exceptions";
import type { AiProviderId } from "../domain/ai-client";

export interface ProviderRequest {
  provider: AiProviderId;
  /** POST (a completion, the default) or GET (the key check's model list). */
  method?: "GET" | "POST";
  url: string;
  /** Auth and version headers; `content-type` is added when there's a body. */
  headers: Record<string, string>;
  /** Sent as JSON. Not for a GET. */
  body?: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  /**
   * Whether a failed answer means "the key is bad". Default: 401 or 403.
   * Gemini answers a bad key with a 400, so it passes its own.
   */
  isKeyRejected?: (status: number, body: string) => boolean;
}

const defaultIsKeyRejected = (status: number) => status === 401 || status === 403;

/**
 * Calls a provider and returns its JSON answer — or throws one of our
 * exceptions, so every provider fails the same way (see `AiClient.complete`).
 *
 * Nothing the provider said reaches the client: its error body is logged here,
 * and the exception's detail names only the provider and the status. The key
 * is in the headers only and is never logged.
 */
export async function callProvider<T>(request: ProviderRequest): Promise<T> {
  const { provider, method = "POST", url, headers, body, timeoutMs, signal } = request;
  const timeout = AbortSignal.timeout(timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: "no-store",
    });
  } catch (error) {
    if (timeout.aborted) throw new ServiceUnavailableError(`${provider} timed out after ${timeoutMs} ms`);
    if (signal?.aborted) throw error; // the caller cancelled: not a provider failure
    throw new ServiceUnavailableError(`${provider} unreachable: ${(error as Error).message}`);
  }

  if (response.ok) {
    try {
      return (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableError(`${provider} answered ${response.status} with a body that isn't JSON`);
    }
  }

  const text = await response.text().catch(() => "");
  const isKeyRejected = request.isKeyRejected ?? defaultIsKeyRejected;

  if (isKeyRejected(response.status, text)) {
    throw new AiKeyRejectedError(`${provider} refused the key (${response.status})`);
  }
  if (response.status === 429) {
    throw new AiProviderLimitedError(`${provider} is throttling the key`, retryAfterSeconds(response.headers));
  }
  if (response.status >= 500) {
    throw new ServiceUnavailableError(`${provider} answered ${response.status}`);
  }

  // Any other 4xx means the provider refused the request itself — a model
  // that doesn't exist, a parameter it doesn't take. That's ours to fix, so
  // it's logged with what the provider said.
  console.error(`[ai] ${provider} refused the request (${response.status})`, text.slice(0, 2000));
  throw new InternalServerError(`${provider} refused the request (${response.status})`);
}

/** `Retry-After` in seconds, when it's given as seconds. */
function retryAfterSeconds(headers: Headers): number | undefined {
  const value = Number(headers.get("retry-after"));
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : undefined;
}
