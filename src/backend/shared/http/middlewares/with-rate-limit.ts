import { getRateLimiter, RATE_LIMIT_POLICIES, secondsUntil, type RateLimitPolicyName } from "@/backend/shared/rate-limit";
import type { Middleware, RouteContext } from "@/backend/shared/types/middleware";

import { clientIp } from "../client-ip";

/** Who this call counts against, from the policy's `by`. */
function subjectOf(policy: RateLimitPolicyName, ctx: RouteContext): string {
  const by = (RATE_LIMIT_POLICIES[policy] as { by?: string }).by ?? "user";
  if (by === "global") return "all";
  if (by === "user" && ctx.user) return `user:${ctx.user.id}`;
  // No address in local dev (nothing in front of the app): everyone shares one bucket.
  return `ip:${clientIp(ctx.request) ?? "unknown"}`;
}

/**
 * Counts the call against the route's policy (`@/backend/shared/rate-limit`)
 * and refuses it with a 429 (`rate-limited`, `Retry-After`) when it's over.
 *
 * Runs after authentication, so a `by: "user"` policy can count the signed-in
 * user rather than their address. Allowed calls carry how much is left, in
 * the IETF draft's headers: `RateLimit-Limit`, `RateLimit-Remaining`,
 * `RateLimit-Reset` (seconds).
 */
export function withRateLimit(policy: RateLimitPolicyName): Middleware {
  return async (ctx, next) => {
    const decision = await getRateLimiter().enforce(policy, subjectOf(policy, ctx));
    const response = await next(ctx);
    if (decision) {
      try {
        response.headers.set("RateLimit-Limit", String(decision.limit));
        response.headers.set("RateLimit-Remaining", String(decision.remaining));
        response.headers.set("RateLimit-Reset", String(secondsUntil(decision.resetAt)));
      } catch {
        // Some responses (a redirect) have immutable headers; the limit still applied.
      }
    }
    return response;
  };
}
