import { NextResponse } from "next/server";

/** Every API answer is per-user or changes with the user's actions: never cached. */
export const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * A JSON response, never cached. What a handler returns when it needs a status
 * other than 200 — a plain return value becomes `json(value)` automatically
 * (see `withMiddlewares`).
 */
export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}): NextResponse {
  return NextResponse.json(data, { status: init.status ?? 200, headers: { ...NO_STORE, ...init.headers } });
}
