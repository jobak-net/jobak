import type { NextRequest } from "next/server";

import { getAuthModule } from "@/backend/modules/auth/composition";
import { getRequestContext } from "@/backend/modules/auth/infrastructure/http";
import {
  enforceRateLimit,
  rateLimitKey,
} from "@/backend/modules/auth/interface/http/rate-limit";
import { readJsonBody } from "@/backend/modules/auth/interface/http/request";
import {
  jsonResponse,
  withAuthErrors,
} from "@/backend/modules/auth/interface/http/responses";
import { getWaitlistModule } from "@/backend/modules/waitlist";

/**
 * POST /api/v1/waitlist
 *
 * Adds an address to the launch waitlist.
 *
 * Always reports success, including for an address already on the list — the
 * response must not reveal who has signed up, and someone clicking twice should
 * not be told off.
 *
 * Borrows the auth module's rate limiter and error wrapper. Those are general
 * HTTP-edge concerns rather than anything auth-specific, and duplicating them
 * for one route would mean two limiters to keep in step.
 */
export const dynamic = "force-dynamic";

/**
 * Looser than the auth limits: this is the site's primary call to action, and a
 * shared office or campus IP could legitimately produce several signups. Still
 * bounded, because an unbounded endpoint that writes a row is a way to fill the
 * table with junk.
 */
const LIMIT = { limit: 10, windowSeconds: 15 * 60 };

export async function POST(request: NextRequest) {
  return withAuthErrors("waitlist", async () => {
    const { ipAddress } = await getRequestContext();

    await enforceRateLimit(
      getAuthModule().rateLimiter,
      rateLimitKey("waitlist", ipAddress),
      LIMIT,
    );

    const body = await readJsonBody(request);

    await getWaitlistModule().join.execute({
      email: body.email,
      field: body.field,
      jobTitles: body.jobTitles,
      countries: body.countries,
      workPreference: body.workPreference,
      source: body.source,
      // Taken from the header, not the body: the browser sets it, and a client
      // that wanted to lie could put anything in the payload anyway.
      referrer: request.headers.get("referer"),
    });

    return jsonResponse({ joined: true });
  });
}
