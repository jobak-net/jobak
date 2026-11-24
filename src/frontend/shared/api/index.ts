/**
 * How the frontend talks to the backend — safe to import anywhere, client or
 * server. `serverFetch` is not here: it reads request headers and is
 * server-only, so it has its own entry, `@/frontend/shared/api/server`.
 *
 * What each endpoint is belongs to the module that calls it
 * (`modules/<name>/api/`), not here.
 */
export { clientFetch } from "./client-fetch";
export type { FetchOptions, FetchResult } from "./fetch-result";
export { ApiError, errorMessageOf } from "./api-error";
export { queryClientConfig, smartRetry, unwrap, useGenericMutation, useGenericQuery } from "./query-config";
