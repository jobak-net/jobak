/**
 * Server entry point for the integrations module: the outside services Jobak
 * calls on a user's behalf, each in its own folder behind one interface.
 *
 *   ai/   the AI providers (Groq, Gemini, OpenAI, Claude) — `createAiClient`,
 *         and the user's AI settings (the model per provider)
 *
 * Other modules import from here only, never a file inside.
 */
export { getIntegrationsModule, type IntegrationsModule } from "./composition";
export {
  AI_DEFAULT_MODELS,
  createAiClient,
  type AiClient,
  type AiClientOptions,
  type AiCompletion,
  type AiCompletionRequest,
  type AiFinishReason,
  type AiMessage,
  type AiProviderId,
} from "./ai";
