import { failureFrom, malformedSuccess, networkFailure, type FetchOptions, type FetchResult } from "./fetch-result";

/**
 * The browser's one way to call the backend — the client-side twin of
 * `serverFetch`, with the same options and the same result kinds. Used as the
 * function inside TanStack Query (`useQuery` / `useMutation`, in
 * `src/frontend/lib/api/<resource>/`), never in a bare `useEffect`.
 *
 *  - **Where:** `NEXT_PUBLIC_API_BASE_URL` when set, otherwise the same origin
 *    (a relative URL) — today the API routes are part of this Next app.
 *  - **Who is asking:** the browser's own cookies. Same origin sends them by
 *    default; a backend on another origin gets them with `credentials:
 *    "include"` (and must allow it with CORS).
 *  - **Errors:** a failure carries the shared error `code` and its message
 *    (`@/shared/errors`) — the same words the backend sent.
 *  - **Freshness:** never cached by the browser. TanStack Query does the
 *    caching, on purpose and per key.
 *
 * Kept apart from `serverFetch`, which reads `next/headers` and must never
 * reach the browser bundle.
 */
export async function clientFetch<T>(
  path: string,
  { method = "GET", body }: FetchOptions = {},
): Promise<FetchResult<T>> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: base ? "include" : "same-origin",
      cache: "no-store",
    });
  } catch {
    return networkFailure();
  }

  if (!response.ok) return failureFrom(response);

  try {
    // Trusted, not validated: the shape is the shared contract the backend answers with.
    return { kind: "ok", data: (await response.json()) as T };
  } catch {
    return malformedSuccess(response.status);
  }
}
