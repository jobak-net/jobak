import {
  isReuse,
  isUsable,
} from "../../domain/entities/session.entity";
import { toPublicUser } from "../../domain/entities/user.entity";
import {
  SessionReuseDetectedException,
  SessionRevokedException,
  SessionRotationConflictException,
} from "../../domain/exceptions";
import { refreshTokenExpiry } from "../../domain/policies/token-lifetimes.policy";
import type { SessionRepository } from "../../domain/ports/session.repository";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import type { AuthResult, SessionContext } from "../dto/auth-result.dto";

/**
 * Exchange a refresh token for a new token pair.
 *
 * Every refresh rotates: the presented token is revoked and replaced, so each
 * one is usable exactly once. That is what makes theft detectable — if a token
 * is presented twice, one of the two presentations came from a copy.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(
    refreshToken: string | null,
    context: SessionContext,
  ): Promise<AuthResult> {
    if (!refreshToken) {
      throw new SessionRevokedException("no refresh token presented");
    }

    const presentedHash = this.tokens.hashRefreshToken(refreshToken);
    const session = await this.sessions.findByRefreshTokenHash(presentedHash);

    if (!session) {
      // Never issued, or issued so long ago the row has been swept.
      throw new SessionRevokedException("unknown refresh token");
    }

    /*
     * A revoked-but-unexpired session means this token was already rotated
     * away, yet someone still holds it. Either it was stolen, or two tabs
     * refreshed at once and this is the loser of the race.
     *
     * We cannot tell the difference, so we assume the worse case and revoke
     * every session the user has. The benign case costs one re-login; the
     * malicious case is stopped.
     */
    if (isReuse(session)) {
      await this.sessions.revokeAllForUser(session.userId, new Date());
      throw new SessionReuseDetectedException(session.userId);
    }

    if (!isUsable(session)) {
      throw new SessionRevokedException("session expired or revoked");
    }

    const user = await this.users.findById(session.userId);

    if (!user) {
      // The account was deleted while the session was live. The FK cascade
      // should have removed this row, so reaching here means something is off.
      await this.sessions.revoke(session.id, new Date());
      throw new SessionRevokedException("user no longer exists");
    }

    const next = this.tokens.generateRefreshToken();

    let rotated;
    try {
      rotated = await this.sessions.rotate(session.id, {
        userId: user.id,
        refreshTokenHash: next.hash,
        expiresAt: refreshTokenExpiry(),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      });
    } catch (error) {
      /*
       * Lost the race: a concurrent refresh revoked this session between the
       * `isReuse` check above and the rotation. Same conclusion as reuse — the
       * token has been spent twice — so it is handled identically rather than
       * surfacing as a 500.
       */
      if (error instanceof SessionRotationConflictException) {
        await this.sessions.revokeAllForUser(user.id, new Date());
        throw new SessionReuseDetectedException(user.id);
      }
      throw error;
    }

    /*
     * Bookkeeping only, and deliberately not allowed to fail the refresh: a
     * missing `last_used_at` is a diagnostic inconvenience, whereas a failed
     * refresh signs the user out.
     */
    void this.sessions
      .touchLastUsed(rotated.id, new Date())
      .catch((error) =>
        console.error("[auth/refresh] touchLastUsed failed", error),
      );

    const accessToken = await this.tokens.signAccessToken({
      sub: user.id,
      sid: rotated.id,
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken: next.token,
      sessionId: rotated.id,
    };
  }
}
