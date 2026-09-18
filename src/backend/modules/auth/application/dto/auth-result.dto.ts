import type { PublicUser } from "../../domain/entities/user.entity";

/**
 * What a successful authentication produces.
 *
 * The tokens are returned rather than written to cookies here on purpose: use
 * cases know nothing about HTTP. The interface layer decides these become
 * cookies — the same result could just as well become a JSON body for a mobile
 * client, without the use case changing.
 *
 * `user` is `PublicUser`, so `passwordHash` cannot reach a response by
 * accident: it is absent from the type, not merely omitted by a mapper someone
 * has to remember to call.
 */
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  /** The session backing the refresh token, for logging and revocation. */
  sessionId: string;
}

/**
 * Where the session is being created from.
 *
 * Recorded against the session for diagnostics only — both values come from
 * client-controlled headers and are never used to authorize anything.
 */
export interface SessionContext {
  userAgent: string | null;
  ipAddress: string | null;
}
