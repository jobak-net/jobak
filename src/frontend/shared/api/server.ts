import "server-only";

/**
 * The server-only half of `@/frontend/shared/api`: calling the backend from a
 * page, layout, loader or guard. Kept out of the main entry so a client
 * component importing `@/frontend/shared/api` never pulls in `next/headers`.
 */
export { serverFetch, type ServerFetchOptions, type ServerFetchResult } from "./server-fetch";
