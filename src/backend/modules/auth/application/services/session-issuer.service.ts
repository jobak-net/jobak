import type { User } from "../../domain/entities/user.entity";
import { toPublicUser } from "../../domain/entities/user.entity";
import { refreshTokenExpiry } from "../../domain/policies/token-lifetimes.policy";
import type { SessionRepository } from "../../domain/ports/session.repository";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { AuthResult, SessionContext } from "../dto/auth-result.dto";

/**
 * Creates a session and the token pair that goes with it.
 *
 * Register, login and refresh all end the same way — new session row, new
 * refresh token, new access token naming both — and that sequence has an order
 * that matters: the access token carries the session id, so the session has to
 * exist before it can be signed. Duplicating it three times would be three
 * chances to get the order wrong.
 *
 * Not a use case itself: nothing calls it from outside, and it enforces no rule
 * about *whether* a session should be issued. It is the shared tail of the ones
 * that do.
 */
export class SessionIssuer {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
  ) {}

  async issue(user: User, context: SessionContext): Promise<AuthResult> {
    /*
     * Generate first, store only the hash. The plaintext half exists in this
     * function and in the cookie the caller sets — nowhere else, and never in
     * the database.
     */
    const refresh = this.tokens.generateRefreshToken();

    const session = await this.sessions.create({
      userId: user.id,
      refreshTokenHash: refresh.hash,
      expiresAt: refreshTokenExpiry(),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    /*
     * `sid` ties the access token to this session. Without it a sign-out could
     * only revoke the refresh token, leaving the access token usable until it
     * expired on its own — up to fifteen minutes of access after the user
     * pressed "log out".
     */
    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      sid: session.id,
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken: refresh.token,
      sessionId: session.id,
    };
  }
}
