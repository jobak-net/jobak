/**
 * The application layer's surface.
 *
 * Use cases orchestrate the domain to carry out one operation each. They depend
 * only on `domain/` — entities, policies, and the port interfaces — never on
 * `infrastructure/`, so they can be exercised with fakes and know nothing about
 * Postgres, bcrypt, cookies or HTTP.
 *
 *   dto/        what crosses the boundary
 *   services/   shared steps used by more than one use case
 *   use-cases/  one operation each
 */

export * from "./dto";
export * from "./services";
export * from "./use-cases";
