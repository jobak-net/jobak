/**
 * Server entry point for the AI tools module: each tool in its own folder
 * (`cover-letter/`), all running on the user's own AI through the
 * integrations module. Guide: `docs/ai-tools/COVER_LETTER.md`.
 */
export { getAiToolsModule, type AiToolsModule } from "./composition";
