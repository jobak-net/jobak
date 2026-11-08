import { checkKeyFormat } from "@/frontend/lib/configs/provider-keys";
import type { AiProvider } from "@/frontend/types/on-boarding";

export type VerifyResult = { ok: true } | { ok: false; message: string };

/**
 * DESIGN STAND-IN — replace when the AI setup is wired to the backend.
 *
 * Plays the part of the real check so the screens can be designed against
 * every state (checking, rejected, connected). It runs only the local format
 * check after a pause; it does not contact the provider and saves nothing.
 *
 * The real version is a server action: run `verify-key.ts` (a free, read-only
 * call to the provider's model list), then encrypt and store the key. Its
 * result has this same shape, so swapping it in changes nothing on screen.
 */
export async function previewVerifyKey(provider: AiProvider, key: string): Promise<VerifyResult> {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const format = checkKeyFormat(provider, key);
    return format.ok ? { ok: true } : { ok: false, message: format.reason };
}
