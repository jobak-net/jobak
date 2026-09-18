import { isExpired } from "../../domain/entities/auth-token.entity";
import {
  InvalidTokenException,
  TokenExpiredException,
} from "../../domain/exceptions";
import type { AuthTokenRepository } from "../../domain/ports/auth-token.repository";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";

/**
 * Confirm an email address from the link that was mailed out.
 *
 * Does not issue a session. The link may well be opened on a different device
 * from the one that signed up — phone versus laptop — and signing that device
 * in because it received an email would make the inbox a credential. The user
 * lands on a "confirmed, please sign in" page instead.
 */
export class VerifyEmailUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(token: string | null): Promise<{ userId: string }> {
    if (!token) throw new InvalidTokenException("no token supplied");

    const record = await this.authTokens.findByHash(
      this.tokens.hashRefreshToken(token),
    );

    /*
     * A consumed token and a token that never existed are reported
     * identically. Distinguishing them would confirm to someone guessing that a
     * particular value was once real.
     */
    if (!record || record.purpose !== "email_verification") {
      throw new InvalidTokenException("unknown or wrong-purpose token");
    }

    if (record.consumedAt !== null) {
      throw new InvalidTokenException("already consumed");
    }

    /*
     * Expiry is checked before consuming, so an expired link is not burned —
     * it was useless anyway, and leaving it unconsumed keeps the "expired"
     * answer available if the user clicks it again rather than flipping to the
     * vaguer "invalid".
     */
    if (isExpired(record)) throw new TokenExpiredException();

    /*
     * The atomic consume is the real gate. Two requests carrying the same link
     * can both reach here having passed the checks above; only one wins this
     * UPDATE, and the loser is told the link was already used.
     */
    const consumed = await this.authTokens.consume(record.id, new Date());
    if (!consumed) throw new InvalidTokenException("lost consume race");

    await this.users.markEmailVerified(record.userId, new Date());

    return { userId: record.userId };
  }
}
