import "server-only";

/**
 * Encrypts the secrets users hand us — their AI and Apify keys — for storage.
 *
 * AES-256-GCM through Web Crypto, with a fresh 12-byte IV per value, stored as
 * `"<iv hex>:<ciphertext hex>"` (the tag is part of the ciphertext). The same
 * scheme and format as the original `crypto/api-key.ts` (and `groq-key.ts`
 * before it), so values written by either still decrypt here.
 *
 * The key is `ENCRYPTION_SECRET`: 64 hex characters (32 bytes). Losing it makes
 * every stored key unreadable, and changing it does the same — users would
 * have to add their keys again. Never log a value going in or coming out.
 */

const ALGORITHM = "AES-GCM";
const IV_BYTES = 12;

let cachedKey: Promise<CryptoKey> | null = null;

function encryptionKey(): Promise<CryptoKey> {
  cachedKey ??= (async () => {
    const secret = process.env.ENCRYPTION_SECRET?.trim();
    if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
      throw new Error("ENCRYPTION_SECRET must be 64 hex characters (32 bytes): generate one with `openssl rand -hex 32`");
    }
    return crypto.subtle.importKey("raw", fromHex(secret), { name: ALGORITHM, length: 256 }, false, ["encrypt", "decrypt"]);
  })().catch((error) => {
    cachedKey = null; // a fixed env on the next request should work without a restart
    throw error;
  });
  return cachedKey;
}

export async function encryptSecret(plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    await encryptionKey(),
    new TextEncoder().encode(plaintext),
  );
  return `${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`;
}

/** Throws when the value is malformed or wasn't encrypted with this `ENCRYPTION_SECRET`. */
export async function decryptSecret(stored: string): Promise<string> {
  const [ivHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !ciphertextHex) throw new Error("Not an encrypted secret");
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: fromHex(ivHex) },
    await encryptionKey(),
    fromHex(ciphertextHex),
  );
  return new TextDecoder().decode(plaintext);
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
