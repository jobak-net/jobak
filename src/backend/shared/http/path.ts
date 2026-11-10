/**
 * URL path helpers. No imports, so the proxy can use them as well as the server.
 */

/** `pathname` is `base` itself or under it — `/register/x`, but not `/registered`. */
export function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}
