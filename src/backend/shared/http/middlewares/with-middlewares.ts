import type { z } from "zod";

import type { PublicUser } from "@/backend/modules/auth/domain/entities";

import { json } from "../respond";
import type { AuthMode, Middleware, Next, RouteContext } from "@/backend/shared/types/middleware";
import { withAuthentication } from "./with-authentication";
import { withErrorHandler } from "./with-error-handler";
import { withValidation } from "./with-validation";

/**
 * Wraps a route handler in the middlewares every API route shares. Order,
 * outer to inner:
 *
 *     error handler → authentication → validation → handler
 *
 * (Rate limiting slots in after the error handler when a route needs it.)
 *
 *   export const PUT = withMiddlewares(
 *     { label: "preferences.update", auth: "required", body: preferencesSchema },
 *     async ({ user, body }) => getPreferencesModule().update.execute(user.id, body),
 *   );
 *
 * The handler gets what the middlewares produced — `user` (never null when auth
 * is `required`), the parsed `body` / `query` / `params` — and returns either
 * plain data (sent as 200 JSON, never cached) or a `Response` for anything
 * else (`json(data, { status })`). To answer with an error, it *throws* one
 * from `@/backend/shared/exceptions`.
 */

export interface RouteOptions<A extends AuthMode, B, Q, P> {
  /** Names the route in logs: "preferences.update". */
  label: string;
  /** Who may call it. Default: `none`. */
  auth?: A;
  /** Zod schemas; each one checked, and its parsed value handed to the handler. */
  body?: B;
  query?: Q;
  params?: P;
}

type Parsed<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface HandlerContext<A extends AuthMode, B, Q, P> {
  request: Request;
  user: A extends "required" ? PublicUser : PublicUser | null;
  body: Parsed<B>;
  query: Parsed<Q>;
  params: P extends z.ZodType ? z.output<P> : Record<string, string | string[]>;
}

/** How Next calls a route handler: the request, and the dynamic segments as a promise. */
type NextRouteHandler = (
  request: Request,
  context: { params: Promise<Record<string, string | string[]>> },
) => Promise<Response>;

export function withMiddlewares<
  A extends AuthMode = "none",
  B extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  P extends z.ZodType | undefined = undefined,
>(
  options: RouteOptions<A, B, Q, P>,
  handler: (ctx: HandlerContext<A, B, Q, P>) => Promise<unknown>,
): NextRouteHandler {
  const chain: Middleware[] = [
    withErrorHandler(options.label),
    withAuthentication(options.auth ?? "none"),
    withValidation({ body: options.body, query: options.query, params: options.params }),
  ];

  const callHandler: Next = async (ctx) => {
    const result = await handler(ctx as unknown as HandlerContext<A, B, Q, P>);
    return result instanceof Response ? result : json(result);
  };

  // reduceRight, so the first middleware listed is the outermost.
  const run = chain.reduceRight<Next>((next, middleware) => (ctx) => middleware(ctx, next), callHandler);

  return async (request, context) => {
    const ctx: RouteContext = {
      request,
      params: (await context?.params) ?? {},
      user: null,
      body: undefined,
      query: undefined,
    };
    return run(ctx);
  };
}
