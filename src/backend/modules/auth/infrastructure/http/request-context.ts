import "server-only";

import { headers } from "next/headers";

/**
 * The diagnostic detail recorded against a session.
 *
 * Both values are client-controlled and trivially spoofed, so neither is ever
 * used to authorize anything — treating an IP change as proof of theft would
 * lock out every user on a mobile network that rotates addresses. They exist so
 * "where was this session created" has an answer when someone asks.
 */

export interface RequestContext {
  userAgent: string | null;
  ipAddress: string | null;
}

/** Long user-agent strings are pointless to store and pointless to read. */
const MAX_USER_AGENT_LENGTH = 512;

/**
 * Behind a proxy the socket address is the proxy's, so the client's is taken
 * from `x-forwarded-for` — a comma-separated list where the first entry is the
 * original client.
 *
 * Worth knowing: that header is only trustworthy when a proxy you control
 * overwrites it at the edge, which most hosting platforms do. Anywhere it is
 * not rewritten, a client can put whatever it likes there — a further reason
 * nothing security-relevant keys off it.
 */
function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return validIp(first);
  }

  // Set directly by several proxies; harmless where it is absent.
  const real = headerList.get("x-real-ip");
  return real ? validIp(real) : null;
}

/**
 * `sessions.ip_address` is an INET column, and Postgres rejects anything that
 * is not a valid address — so an attacker could fail every sign-in simply by
 * sending `x-forwarded-for: nonsense`, turning a spoofable header into a denial
 * of service. Anything unparseable is dropped to null instead.
 *
 * Deliberately loose: this only has to be strict enough that Postgres will
 * accept it, not to validate addressing semantics.
 */
function validIp(value: string): string | null {
  if (value.length > 45) return null; // longest possible IPv6 textual form

  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
  if (isIpv4) {
    return value.split(".").every((o) => Number(o) <= 255) ? value : null;
  }

  // IPv6: hex groups and colons, optionally with an embedded IPv4 tail.
  const isIpv6 = /^[0-9a-fA-F:]+(\.\d{1,3}){0,3}$/.test(value) && value.includes(":");
  return isIpv6 ? value : null;
}

export async function getRequestContext(): Promise<RequestContext> {
  const headerList = await headers();

  const userAgent = headerList.get("user-agent");

  return {
    userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
    ipAddress: clientIp(headerList),
  };
}
