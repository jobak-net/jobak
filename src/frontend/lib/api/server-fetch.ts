import "server-only";

import { headers } from "next/headers";

/**
 * The frontend's one way to call the backend from the server (server
 * components, layouts, guards). Consumers only pick a path and a type:
 *
 *   const result = await serverFetch<AccountStatus>(ACCOUNT_API_PATH);
 *
 * Everything about *how* the backend is reached lives here and nowhere else,
 * so moving the backend to another service or technology means changing this
 * file and one env var:
 *
 *  - **Where:** `API_BASE_URL` when set (e.g. `https://api.example.com`),
 *    otherwise this deployment's own origin — today the API routes are part of
 *    the same Next app.
 *  - **Who is asking:** a server-side fetch doesn't carry the browser's
 *    cookies by itself, so the visitor's `cookie` header is forwarded; that is
 *    how the backend (Clerk's session) knows the user. A backend on another
 *    domain would rather get just the session token as
 *    `Authorization: Bearer …` — switch it here when that happens.
 *  - **Freshness:** never cached. The answers are per-user.
 */

export type ServerFetchResult<T> =
  | { kind: "ok"; data: T }
  /** 401: nobody is signed in. */
  | { kind: "unauthorized" }
  /**
   * Anything else: an error status, an unreachable backend (`status: null`),
   * or a body that isn't JSON. "Couldn't tell", never "signed out".
   */
  | { kind: "failed"; status: number | null };

export interface ServerFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
}

/** `API_BASE_URL`, or this deployment's origin as the request saw it. */
function apiBaseUrl(incoming: Headers): string {
  const configured = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  // Behind a reverse proxy the original host and scheme arrive as `x-forwarded-*`.
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const proto = incoming.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}`;
}

export async function serverFetch<T>(
  path: string,
  { method = "GET", body }: ServerFetchOptions = {},
): Promise<ServerFetchResult<T>> {
  const incoming = await headers();

  const outgoing: Record<string, string> = { accept: "application/json" };
  const cookie = incoming.get("cookie");
  if (cookie) outgoing.cookie = cookie;
  if (body !== undefined) outgoing["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl(incoming)}${path}`, {
      method,
      headers: outgoing,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[server-fetch] ${method} ${path}: backend unreachable`, error);
    return { kind: "failed", status: null };
  }

  if (response.status === 401) return { kind: "unauthorized" };
  if (!response.ok) {
    console.error(`[server-fetch] ${method} ${path}: ${response.status}`);
    return { kind: "failed", status: response.status };
  }

  try {
    // Trusted, not validated: the shape is the shared contract the backend answers with.
    return { kind: "ok", data: (await response.json()) as T };
  } catch (error) {
    console.error(`[server-fetch] ${method} ${path}: response is not JSON`, error);
    return { kind: "failed", status: response.status };
  }
}
