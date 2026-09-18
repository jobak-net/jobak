import { EmailTakenException } from "../../domain/exceptions";
import { emailVerificationExpiry } from "../../domain/policies/token-lifetimes.policy";
import type { AuthTokenRepository } from "../../domain/ports/auth-token.repository";
import type { EmailSender } from "../../domain/ports/email-sender.port";
import type { PasswordHasher } from "../../domain/ports/password-hasher.port";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Password } from "../../domain/value-objects/password.vo";
import type { RegistrationResult } from "../dto/registration-result.dto";
import type { VerificationLinkBuilder } from "../services/link-builder.service";

export interface RegisterInput {
  email: unknown;
  password: unknown;
  fullName?: unknown;
}

/** Full name is optional and cosmetic — long values are trimmed, not rejected. */
const MAX_FULL_NAME_LENGTH = 200;

function normaliseFullName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_FULL_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Create an account. No session is issued — the address must be confirmed
 * first, and `LoginUseCase` refuses until it is.
 *
 * ── Account enumeration is closed here ──────────────────────
 * Because nothing is returned that depends on whether the address was
 * available, a collision can be handled silently: the response is identical
 * either way, so the form cannot be used to test whether someone has an account.
 *
 * What differs is only which email is sent. A new address gets a verification
 * link; an existing one gets nothing from this path (see `handleExistingUser`).
 * Both callers see the same "check your inbox" result.
 *
 * This is the fix for the trade-off the previous version documented and
 * accepted. It became affordable the moment registration stopped signing people
 * in, since there is no longer a session that a colliding request could not
 * produce.
 */
export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly email: EmailSender,
    private readonly links: VerificationLinkBuilder,
  ) {}

  async execute(input: RegisterInput): Promise<RegistrationResult> {
    // Both throw on failure, so nothing unvalidated reaches the database.
    const email = Email.create(input.email);
    const password = Password.create(input.password);
    const fullName = normaliseFullName(input.fullName);

    /*
     * Hash before the insert attempt, and unconditionally.
     *
     * Doing it here rather than after a collision check means the request costs
     * the same ~250ms whether or not the address was free — otherwise a
     * colliding registration would return noticeably faster and reintroduce the
     * enumeration leak through timing, having just closed it in the response.
     */
    const passwordHash = await this.hasher.hash(password.value);

    try {
      /*
       * No prior "is this taken" query. The unique index decides, which also
       * closes the race where two simultaneous registrations both see the
       * address as available.
       */
      const user = await this.users.create({
        email: email.value,
        passwordHash,
        fullName,
      });

      await this.sendVerificationEmail(user.id, email.value, fullName);
    } catch (error) {
      if (error instanceof EmailTakenException) {
        await this.handleExistingUser(email.value);
      } else {
        throw error;
      }
    }

    return { email: email.value, verificationRequired: true };
  }

  /**
   * Someone tried to register an address that already has an account.
   *
   * Nothing is changed and no link is sent: issuing a verification token here
   * would let a stranger trigger mail to an address they do not control, and
   * the account already exists so there is nothing to confirm.
   *
   * The right addition later is a "someone tried to sign up with your address"
   * notice to the existing account, which tells the real owner something useful
   * without telling the visitor anything. That needs a template, so it waits
   * for the real email sender.
   */
  private async handleExistingUser(email: string): Promise<void> {
    console.info(
      "[auth/register] registration attempt for existing address",
      // Logged as a hash so the log is not itself a list of registered users.
      this.tokens.hashRefreshToken(email).slice(0, 12),
    );
  }

  private async sendVerificationEmail(
    userId: string,
    to: string,
    fullName: string | null,
  ): Promise<void> {
    /*
     * Best-effort: the account exists whether or not the provider is reachable.
     * Failing the registration because a mail server hiccuped would be the
     * wrong trade — they can request another link, but they cannot easily
     * recover a signup that appeared to fail after the row was written.
     */
    try {
      const token = this.tokens.generateRefreshToken();

      await this.authTokens.create({
        userId,
        tokenHash: token.hash,
        purpose: "email_verification",
        expiresAt: emailVerificationExpiry(),
      });

      await this.email.sendEmailVerification({
        to,
        fullName,
        link: this.links.emailVerification(token.token),
      });
    } catch (error) {
      console.error("[auth/register] verification email failed", error);
    }
  }
}
