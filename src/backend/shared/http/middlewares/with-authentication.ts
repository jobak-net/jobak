import { getAuthModule } from "@/backend/modules/auth/composition";

import { UnauthorizedError } from "@/backend/shared/exceptions";
import type { AuthMode, Middleware } from "@/backend/shared/types/middleware";

/**
 * Finds out who is asking and puts it on the context as `user`.
 *
 * The user id always comes from the session (Clerk's, read by the proxy), never
 * from the request — so a handler can scope every query by `user.id` safely.
 *
 * A failed lookup (the database, say) is *thrown*, not folded into "signed
 * out": it reaches the error handler as a 503. A 401 makes the browser go to
 * sign in, and for someone who is signed in that's a redirect loop.
 */
export function withAuthentication(mode: AuthMode): Middleware {
  return async (ctx, next) => {
    if (mode === "none") return next(ctx);

    const user = await getAuthModule().getCurrentUser.execute();
    if (!user && mode === "required") throw new UnauthorizedError();

    return next({ ...ctx, user });
  };
}
