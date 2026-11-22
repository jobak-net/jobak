import "server-only";

import { OpenAiCompatibleClient } from "./openai-compatible.client";

/** Groq — Chat Completions at Groq's OpenAI-compatible endpoint. Keys: `gsk_…`. */
export class GroqClient extends OpenAiCompatibleClient {
  readonly provider = "groq" as const;
  protected readonly baseUrl = "https://api.groq.com/openai/v1";
}
