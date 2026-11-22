import "server-only";

import type { AiCompletion, AiFinishReason } from "../../domain/ai-client";

import { BaseAiClient, type PreparedRequest } from "../base-ai-client";
import { callProvider } from "../http";

/** The parts of a Messages API answer we read. */
interface MessagesResponse {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Anthropic (Claude) — the Messages API (`POST /v1/messages`). Keys: `sk-ant-…`.
 *
 * Differs from Chat Completions in three ways handled here: the system prompt
 * is its own field, `max_tokens` is required, and the reply is a list of
 * content blocks. It has no JSON mode, so JSON relies on the instruction the
 * base class adds to the system prompt.
 */
export class AnthropicClient extends BaseAiClient {
  readonly provider = "anthropic" as const;

  protected async probe(timeoutMs: number): Promise<void> {
    await callProvider({
      provider: this.provider,
      method: "GET",
      url: "https://api.anthropic.com/v1/models?limit=1",
      headers: this.headers(),
      timeoutMs,
    });
  }

  private headers(): Record<string, string> {
    return { "x-api-key": this.config.apiKey, "anthropic-version": "2023-06-01" };
  }

  protected async send(request: PreparedRequest): Promise<AiCompletion> {
    const data = await callProvider<MessagesResponse>({
      provider: this.provider,
      url: "https://api.anthropic.com/v1/messages",
      headers: this.headers(),
      body: {
        model: this.config.model,
        max_tokens: request.maxTokens,
        ...(request.system && { system: request.system }),
        messages: request.messages,
        ...(request.temperature !== undefined && { temperature: request.temperature }),
      },
      timeoutMs: this.config.timeoutMs,
      signal: request.signal,
    });

    return {
      text: (data.content ?? [])
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join(""),
      finishReason: finishReason(data.stop_reason),
      provider: this.provider,
      model: this.config.model,
      usage: data.usage
        ? { inputTokens: data.usage.input_tokens ?? 0, outputTokens: data.usage.output_tokens ?? 0 }
        : null,
    };
  }
}

function finishReason(value: string | null | undefined): AiFinishReason {
  if (value === "end_turn" || value === "stop_sequence") return "stop";
  if (value === "max_tokens") return "length";
  return "other";
}
