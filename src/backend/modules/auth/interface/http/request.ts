import "server-only";

import type { NextRequest } from "next/server";

/**
 * Reads a JSON body without throwing.
 *
 * A malformed or absent body returns `{}` rather than a parse error, because
 * the fields are validated downstream anyway: the value objects reject a
 * missing email or password with a message meant for the user, which is a
 * better answer than "Unexpected token < in JSON".
 *
 * Typed as `Record<string, unknown>` deliberately. The parsed body is untrusted
 * input, and giving it a specific shape here would be a claim nothing has
 * checked — `Email.create` and `Password.create` take `unknown` for the same
 * reason.
 */
export async function readJsonBody(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    // `null`, arrays and primitives are all valid JSON but not usable bodies.
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return {};
    }

    return body as Record<string, unknown>;
  } catch {
    return {};
  }
}
