import "server-only";

import { OpenAiCompatibleClient } from "./openai-compatible.client";

/** OpenAI — Chat Completions. Keys: `sk-…`. */
export class OpenAiClient extends OpenAiCompatibleClient {
  readonly provider = "openai" as const;
  protected readonly baseUrl = "https://api.openai.com/v1";
}
