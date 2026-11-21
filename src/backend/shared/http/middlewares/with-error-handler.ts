import { unstable_rethrow } from "next/navigation";

import { BaseError } from "@/backend/shared/exceptions";
import type { Middleware } from "@/backend/shared/types/middleware";
import { ERROR_MESSAGES, type ErrorResponseBody } from "@/shared/errors";

import { json } from "../respond";

/**
 * The outermost middleware: turns whatever the route throws into a response.
 *
 *  - A `BaseError` (`@/backend/shared/exceptions`) → its status, with
 *    `{ error, code, detail? }`. `error` is the shared message for the code —
 *    the same words the frontend shows — and `detail` is the developer note.
 *  - Next's own control-flow signals → passed on untouched.
 *  - Anything else → logged with the route's label, and answered as
 *    `service-unavailable` (503) with nothing about why: no paths, stack or
 *    database detail reach the client. 503 rather than 500 because it's
 *    almost always the database or an upstream service, and because the
 *    frontend reads it as "couldn't tell" — never as "signed out".
 */
export function withErrorHandler(label: string): Middleware {
  return async (ctx, next) => {
    try {
      return await next(ctx);
    } catch (error) {
      unstable_rethrow(error);

      if (error instanceof BaseError) {
        const body: ErrorResponseBody = { error: error.userMessage, code: error.code };
        if (error.detail) body.detail = error.detail;
        return json(body, { status: error.status });
      }

      console.error(`[api] ${label} failed`, error);
      const body: ErrorResponseBody = { error: ERROR_MESSAGES["service-unavailable"], code: "service-unavailable" };
      return json(body, { status: 503 });
    }
  };
}
