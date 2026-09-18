/**
 * The infrastructure layer's surface.
 *
 * Everything that talks to something outside the process lives here, and only
 * here: `pg`, `bcryptjs`, `jose`, cookies. The domain defines the ports; these
 * are the plugs.
 *
 *   database/      connection + query helpers
 *   mappers/       database rows → domain entities
 *   repositories/  the persistence ports, implemented
 *   security/      password hashing and token signing
 *   http/          cookies and request metadata
 *
 * Nothing under `application/` should import from this folder directly — use
 * cases receive their dependencies as ports, and the composition root is what
 * decides these are the implementations.
 */

export { getPool, query, queryOne, transaction } from "./database";
export * from "./mappers";
export * from "./repositories";
export * from "./email";
export * from "./security";
export * from "./http";
