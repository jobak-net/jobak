import type { AiProvider } from "@/frontend/types/on-boarding";

/**
 * How each AI provider is presented in the AI setup.
 *
 * Which providers exist, and what their keys look like, is not decided here:
 * that is `AI_PROVIDERS` and `keyRules` in `lib/configs/provider-keys.ts`,
 * shared with the server. This is only the copy and the links.
 */
export interface ProviderInfo {
    name: string;
    /** One line on what it is, for the choice card. */
    tagline: string;
    /** Pricing, honestly: whether a free tier exists, not a price. */
    pricing: string;
    free: boolean;
    recommended?: boolean;
    /** Where the user creates a key. */
    keyUrl: string;
    keyUrlLabel: string;
    /** The steps to get there, in the provider's own words where possible. */
    keySteps: string[];
    placeholder: string;
}

export const PROVIDER_INFO: Record<AiProvider, ProviderInfo> = {
    groq: {
        name: "Groq",
        tagline: "Fast open models. The quickest way to get started.",
        pricing: "Free tier",
        free: true,
        recommended: true,
        keyUrl: "https://console.groq.com/keys",
        keyUrlLabel: "console.groq.com/keys",
        keySteps: ["Sign in to the Groq console", "Open API Keys and choose Create API Key", "Copy the key and paste it below"],
        placeholder: "gsk_…",
    },
    gemini: {
        name: "Google Gemini",
        tagline: "Google's models, through Google AI Studio.",
        pricing: "Free tier",
        free: true,
        keyUrl: "https://aistudio.google.com/app/apikey",
        keyUrlLabel: "aistudio.google.com/app/apikey",
        keySteps: ["Sign in to Google AI Studio", "Choose Get API key, then Create API key", "Copy the key and paste it below"],
        placeholder: "AIza…",
    },
    openai: {
        name: "OpenAI",
        tagline: "GPT models, billed to your OpenAI account.",
        pricing: "Pay as you go",
        free: false,
        keyUrl: "https://platform.openai.com/api-keys",
        keyUrlLabel: "platform.openai.com/api-keys",
        keySteps: ["Sign in to the OpenAI platform", "Open API keys and choose Create new secret key", "Copy the key and paste it below"],
        placeholder: "sk-…",
    },
    anthropic: {
        name: "Claude",
        tagline: "Anthropic's Claude models, billed to your Anthropic account.",
        pricing: "Pay as you go",
        free: false,
        keyUrl: "https://console.anthropic.com/settings/keys",
        keyUrlLabel: "console.anthropic.com/settings/keys",
        keySteps: ["Sign in to the Anthropic Console", "Open API keys and choose Create Key", "Copy the key and paste it below"],
        placeholder: "sk-ant-…",
    },
};

/** Display order: the free options first, the recommended one leading. */
export const PROVIDER_ORDER: AiProvider[] = ["groq", "gemini", "openai", "anthropic"];
