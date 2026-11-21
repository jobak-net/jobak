import { ERROR_MESSAGES, type ErrorCode } from "@/shared/errors";

import type { FetchResult } from "./fetch-result";

/**
 * The frontend's one error type for a failed backend call — what the hooks in
 * `src/frontend/hooks/api/` throw, and what screens catch.
 *
 * Its `message` is always the shared message for its `code`
 * (`@/shared/errors`), the same words the backend sent, so a
 * screen shows `error.message` and never words an error itself.
 *
 *   onError: (error) => {
 *     if (error instanceof ApiError && error.code === "unauthorized") return goSignIn();
 *     show(error instanceof ApiError ? error.message : ERROR_MESSAGES.internal);
 *   }
 */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    /** The HTTP status, or null when there was no response. */
    readonly status: number | null = null,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = "ApiError";
  }

  /** From a failed `serverFetch` / `clientFetch` result. */
  static from(result: Exclude<FetchResult<unknown>, { kind: "ok" }>): ApiError {
    return new ApiError(result.code, result.kind === "unauthorized" ? 401 : result.status);
  }
}

/** The message to show for anything a backend call threw. */
export function errorMessageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : ERROR_MESSAGES.internal;
}
