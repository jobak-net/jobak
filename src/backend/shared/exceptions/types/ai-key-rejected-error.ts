import { BaseError } from "../base";

/**
 * 422 — the user's AI provider refused their key: revoked, mistyped, or out of
 * credit. The fix is theirs (replace the key in Settings), so it gets its own
 * code rather than a 401, which the frontend reads as "signed out".
 */
export class AiKeyRejectedError extends BaseError {
  readonly status = 422;
  readonly code = "ai-key-rejected" as const;
}
