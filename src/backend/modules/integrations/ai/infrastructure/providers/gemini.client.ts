import "server-only";

import type { AiCompletion, AiFinishReason } from "../../domain/ai-client";

import { BaseAiClient, type PreparedRequest } from "../base-ai-client";
import { callProvider } from "../http";

/** The parts of a `generateContent` answer we read. */
interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Google Gemini — `models/<model>:generateContent` on the Gemini API (Google AI
 * Studio keys, `AIza…`).
 *
 * Its own shape: the assistant role is `model`, text sits in `parts`, the
 * system prompt is `systemInstruction`, and a bad key is a 400 naming
 * `API_KEY_INVALID` rather than a 401.
 */
export class GeminiClient extends BaseAiClient {
  readonly provider = "gemini" as const;

  protected async probe(timeoutMs: number): Promise<void> {
    await callProvider({
      provider: this.provider,
      method: "GET",
      url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      headers: { "x-goog-api-key": this.config.apiKey },
      timeoutMs,
      isKeyRejected,
    });
  }

  protected async send(request: PreparedRequest): Promise<AiCompletion> {
    const model = encodeURIComponent(this.config.model);

    const data = await callProvider<GenerateContentResponse>({
      provider: this.provider,
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      headers: { "x-goog-api-key": this.config.apiKey },
      body: {
        ...(request.system && { systemInstruction: { parts: [{ text: request.system }] } }),
        contents: request.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          ...(request.temperature !== undefined && { temperature: request.temperature }),
          ...(request.responseFormat === "json" && { responseMimeType: "application/json" }),
        },
      },
      timeoutMs: this.config.timeoutMs,
      signal: request.signal,
      isKeyRejected,
    });

    const candidate = data.candidates?.[0];
    return {
      text: (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join(""),
      finishReason: finishReason(candidate?.finishReason),
      provider: this.provider,
      model: this.config.model,
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount ?? 0,
            outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : null,
    };
  }
}

/** Gemini answers a bad key with a 400 naming `API_KEY_INVALID`, not a 401. */
function isKeyRejected(status: number, body: string): boolean {
  return status === 401 || status === 403 || (status === 400 && /API_KEY_INVALID|API key not valid/i.test(body));
}

function finishReason(value: string | undefined): AiFinishReason {
  if (value === "STOP") return "stop";
  if (value === "MAX_TOKENS") return "length";
  return "other";
}
