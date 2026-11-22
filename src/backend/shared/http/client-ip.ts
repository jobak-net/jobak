/**
 * The sender's address as the platform's proxy reports it (the first entry of
 * `x-forwarded-for`), or null.
 *
 * A hint, not an identity: the header is easy to forge when nothing in front
 * of the app overwrites it. Fine for keying a soft rate limit; never use it to
 * authorise anything.
 */
export function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
