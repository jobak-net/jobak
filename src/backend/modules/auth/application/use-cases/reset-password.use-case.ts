import { isExpired } from "../../domain/entities/auth-token.entity";
import {
  InvalidTokenException,
  TokenExpiredException,
} from "../../domain/exceptions";
import type { AuthTokenRepository } from "../../domain/ports/auth-token.repository";
import type { PasswordHasher } from "../../domain/ports/password-hasher.port";
import type { SessionRepository } from "../../domain/ports/session.repository";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import { Password } from "../../domain/value-objects/password.vo";

/**
 * Set a new password from a reset link.
 *
 * Does not sign the user in. The link arrives by email, so it may be opened on
 * a device that has never been trusted — issuing a session there would make the
 * inbox equivalent to the password. They set the password, then log in with it,
 * which also confirms they can actually use what they just chose.
 */
export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenRepository,
    private readonly sessions: SessionRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(token: string | null, newPassword: unknown): Promise<void> {
    if (!token) throw new InvalidTokenException("no token supplied");

    /*
     * Validate the password before spending the token. Otherwise a password
     * that fails policy — too short, over bcrypt's 72 bytes — would burn the
     * single-use link, and the user would be told to request another before
     * they could correct a typo.
     */
    const password = Password.create(newPassword);

    const record = await this.authTokens.findByHash(
      this.tokens.hashRefreshToken(token),
    );

    /*
     * The purpose check matters more here than anywhere else: without it an
     * email-verification token — which is easier to obtain, since registration
     * mails one to any address given — would be accepted as authorisation to
     * change a password.
     */
    if (!record || record.purpose !== "password_reset") {
      throw new InvalidTokenException("unknown or wrong-purpose token");
    }

    if (record.consumedAt !== null) {
      throw new InvalidTokenException("already consumed");
    }

    // Checked before consuming, so an expired link is not burned and can still
    // report "expired" rather than the vaguer "invalid" on a second click.
    if (isExpired(record)) throw new TokenExpiredException();

    /*
     * The atomic consume is the real gate. Two requests carrying the same link
     * can both pass the checks above; only one wins this UPDATE. For a reset
     * link that matters — the loser must not also get to set a password.
     */
    const consumed = await this.authTokens.consume(record.id, new Date());
    if (!consumed) throw new InvalidTokenException("lost consume race");

    const passwordHash = await this.hasher.hash(password.value);
    await this.users.updatePasswordHash(record.userId, passwordHash);

    /*
     * Every existing session ends.
     *
     * A reset usually means the account was compromised or the password was
     * forgotten on a device someone else may hold. Leaving old sessions live
     * would let whoever prompted the reset keep their access, which defeats the
     * point of resetting.
     */
    await this.sessions.revokeAllForUser(record.userId, new Date());
  }
}
