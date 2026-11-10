/**
 * The middleware pipeline: the steps `src/proxy.ts` runs on every request, and
 * the runner for them.
 *
 * Everything in `shared/middleware/` is loaded by the proxy, so:
 *  - no server-only imports. From a module, take only its `domain/` files or
 *    its plain config — never its `index.ts`, which pulls in `server-only`.
 *  - no `index.ts` barrel here either. Import each file by its own path.
 */
import { NextResponse, type NextRequest } from "next/server";

/**
 * One thing the proxy does to a request. A step can:
 *
 *  - **end the request**: return a response (a redirect, a rewrite, a 4xx).
 *    No later step runs, and the response that is returned is the whole answer.
 *    Anything earlier steps set on the shared `response` is dropped, so copy
 *    it over if the new response needs it.
 *  - **add to it and go on**: set cookies or headers on `response` and return
 *    nothing. The next step runs.
 *  - **pass**: return nothing and touch nothing.
 *
 * May be async.
 */
export type ProxyStep = (
  request: NextRequest,
  response: NextResponse,
) => NextResponse | void | Promise<NextResponse | void>;

/**
 * Runs `steps` in order against one shared `NextResponse.next()`. The first
 * step that returns a response ends the request; otherwise the request goes on
 * to its route with whatever the steps added.
 */
export function runSteps(steps: readonly ProxyStep[]) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = NextResponse.next();
    for (const step of steps) {
      const ended = await step(request, response);
      if (ended) return ended;
    }
    return response;
  };
}
