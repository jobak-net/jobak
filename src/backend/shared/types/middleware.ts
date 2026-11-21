import type { PublicUser } from "@/backend/modules/auth/domain/entities";

/**
 * What flows through the middleware chain. Each middleware may add to it —
 * authentication sets `user`, validation replaces `body` / `query` / `params`
 * with their parsed values — and hands it to the next.
 */
export interface RouteContext {
  request: Request;
  /** The route's dynamic segments (`[step]` …), parsed when the route has a `params` schema. */
  params: unknown;
  /** Set by `withAuthentication`; null when nobody is signed in (or auth isn't asked for). */
  user: PublicUser | null;
  /** Set by `withValidation` when the route has a `body` schema. */
  body: unknown;
  /** Set by `withValidation` when the route has a `query` schema. */
  query: unknown;
}

export type Next = (ctx: RouteContext) => Promise<Response>;

/** One link in the chain: do something, then call `next` — or answer without it. */
export type Middleware = (ctx: RouteContext, next: Next) => Promise<Response>;

/**
 *  - `required`: no user → 401, before the handler runs.
 *  - `optional`: the handler gets the user or null (public routes that attribute
 *    when they can, like feedback).
 *  - `none`: nobody is looked up (webhooks, public catalogue).
 */
export type AuthMode = "required" | "optional" | "none";
