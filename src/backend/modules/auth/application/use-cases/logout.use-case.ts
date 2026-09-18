import type { SessionRepository } from "../../domain/ports/session.repository";
import type { TokenService } from "../../domain/ports/token.service.port";

/**
 * End a session.
 *
 * Never throws. Sign-out must succeed from any state — an expired token, a
 * session already revoked in another tab, a cookie that was never valid. The
 * user's intent is "I am done", and reporting an error there would leave them
 * looking signed in with no way out.
 *
 * Clearing the cookies is the caller's job; this revokes the server-side
 * record, which is the half that actually matters. A discarded cookie is still
 * a live credential if someone else kept a copy.
 */
export class LogoutUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string | null): Promise<void> {
    if (!refreshToken) return;

    try {
      const hash = this.tokens.hashRefreshToken(refreshToken);
      const session = await this.sessions.findByRefreshTokenHash(hash);

      /*
       * Revoking an already-revoked session is a no-op in the repository, so
       * there is nothing to check for here.
       *
       * Note the access token is not revoked — it cannot be, being stateless.
       * It stays valid until it expires, which is why its lifetime is short and
       * why the session reader checks `sid` against the sessions table.
       */
      if (session) {
        await this.sessions.revoke(session.id, new Date());
      }
    } catch (error) {
      console.error("[auth/logout] revoke failed", error);
    }
  }

  /**
   * Ends every session the user has, not just this one.
   *
   * For "sign out everywhere", and used internally after a password change —
   * if the password was changed because it was compromised, the sessions opened
   * with the old one cannot be trusted either.
   */
  async executeAll(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId, new Date());
  }
}
