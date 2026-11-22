import { BaseError } from "../base";

/**
 * 409 — the AI needs a saved key the user doesn't have: none connected, the
 * provider asked for isn't one of theirs, or the stored key can no longer be
 * read. The fix is theirs (add a key in Settings), so it has its own code.
 */
export class AiNotConnectedError extends BaseError {
  readonly status = 409;
  readonly code = "ai-not-connected" as const;
}
