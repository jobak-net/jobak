import type { z } from "zod";

import { UnsupportedMediaTypeError, ValidationError } from "@/backend/shared/exceptions";
import type { Middleware } from "@/backend/shared/types/middleware";

export interface RouteSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Checks the request against the route's Zod schemas and puts the parsed
 * values on the context (`body`, `query`, `params`). A mismatch is a 400 that
 * names the field; the handler only ever sees data of the right shape.
 *
 * A body must be sent as JSON (415 otherwise). Besides being the only format
 * the routes read, it's a guard: a cross-site form can't send
 * `Content-Type: application/json` without a CORS preflight, which these
 * routes never approve — so another site can't post with the visitor's
 * cookies. (Server Actions used to give that protection for free.)
 */
export function withValidation(schemas: RouteSchemas): Middleware {
  return async (ctx, next) => {
    const parsed = { ...ctx };

    if (schemas.params) parsed.params = parse(schemas.params, ctx.params, "route");
    if (schemas.query) {
      parsed.query = parse(schemas.query, Object.fromEntries(new URL(ctx.request.url).searchParams), "query");
    }
    if (schemas.body) parsed.body = parse(schemas.body, await readJson(ctx.request), "body");

    return next(parsed);
  };
}

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new UnsupportedMediaTypeError("Content-Type must be application/json");
  }
  try {
    return await request.json();
  } catch {
    throw new ValidationError("The body isn't valid JSON");
  }
}

function parse<S extends z.ZodType>(schema: S, value: unknown, where: string): z.output<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => `${issue.path.length ? issue.path.join(".") : where}: ${issue.message}`)
    .join("; ");
  throw new ValidationError(`Invalid ${where} — ${issues}`);
}
