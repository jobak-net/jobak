import "server-only";

import type { AiCompletion, AiFinishReason } from "../../domain/ai-client";

import { BaseAiClient, type PreparedRequest } from "../base-ai-client";
import { callProvider } from "../http";

/** The parts of a Chat Completions answer we read. */
interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * The Chat Completions wire format (`POST <base>/chat/completions`), which
 * OpenAI defined and Groq serves as-is. A provider on this format is a
 * subclass naming its base URL.
 */
export abstract class OpenAiCompatibleClient extends BaseAiClient {
  /** e.g. `https://api.openai.com/v1` — without `/chat/completions`. */
  protected abstract readonly baseUrl: string;

  protected async probe(timeoutMs: number): Promise<void> {
    await callProvider({
      provider: this.provider,
      method: "GET",
      url: `${this.baseUrl}/models`,
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      timeoutMs,
    });
  }

  protected async send(request: PreparedRequest): Promise<AiCompletion> {
    const messages = [
      ...(request.system ? [{ role: "system", content: request.system }] : []),
      ...request.messages,
    ];

    const data = await callProvider<ChatCompletionResponse>({
      provider: this.provider,
      url: `${this.baseUrl}/chat/completions`,
      headers: { authorization: `Bearer ${this.config.apiKey}` },
      body: {
        model: this.config.model,
        messages,
        // `max_tokens` is deprecated on both providers and refused by OpenAI's reasoning models.
        max_completion_tokens: request.maxTokens,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.responseFormat === "json" && { response_format: { type: "json_object" } }),
      },
      timeoutMs: this.config.timeoutMs,
      signal: request.signal,
    });

    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content ?? "",
      finishReason: finishReason(choice?.finish_reason),
      provider: this.provider,
      model: this.config.model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 }
        : null,
    };
  }
}

function finishReason(value: string | null | undefined): AiFinishReason {
  if (value === "stop") return "stop";
  if (value === "length") return "length";
  return "other";
}
