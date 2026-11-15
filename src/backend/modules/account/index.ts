/**
 * Server entry point for the account module: who the signed-in viewer is, for
 * `GET /api/v1/me`. The response shape is `@/shared/contracts/account`.
 */
export { getAccountModule, type AccountModule } from "./composition";
