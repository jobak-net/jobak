import { hasPassword } from "../../domain/entities/user.entity";
import { passwordResetExpiry } from "../../domain/policies/token-lifetimes.policy";
import type { AuthTokenRepository } from "../../domain/ports/auth-token.repository";
import type { EmailSender } from "../../domain/ports/email-sender.port";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import type { VerificationLinkBuilder } from "../services/link-builder.service";

/**
 * Send a password reset link.
 *
 * ── Always reports success ──────────────────────────────────
 * Unknown address, OAuth-only account, mail failure — every path returns the
 * same nothing. This endpoint is unauthenticated and takes an email address, so
 * any observable difference turns it into a way to test who has an account
 * here. Same reasoning as `ResendVerificationUseCase`.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenRepository,
    private readonly tokens: TokenService,
    private readonly email: EmailSender,
    private readonly links: VerificationLinkBuilder,
  ) {}

  async execute(rawEmail: unknown): Promise<void> {
    const email = Email.tryCreate(rawEmail);
    if (!email) return;

    try {
      const user = await this.users.findByEmail(email.value);
      if (!user) return;

      /*
       * An account with no password (OAuth-only, once that exists) has nothing
       * to reset. Sending a link that sets a password on it would quietly turn
       * a social login into a password account, which is not what "reset" means
       * and not what the owner asked for.
       */
      if (!hasPassword(user)) return;

      /*
       * Retire outstanding links first. Otherwise each press of the button
       * leaves another live token in the inbox, and a reset link is the most
       * valuable thing we mail — it grants a credential change outright.
       */
      await this.authTokens.invalidateOutstanding(
        user.id,
        "password_reset",
        new Date(),
      );

      const token = this.tokens.generateRefreshToken();

      await this.authTokens.create({
        userId: user.id,
        tokenHash: token.hash,
        purpose: "password_reset",
        expiresAt: passwordResetExpiry(),
      });

      await this.email.sendPasswordReset({
        to: user.email,
        fullName: user.fullName,
        link: this.links.passwordReset(token.token),
      });
    } catch (error) {
      // Swallowed so a failure is indistinguishable from a success.
      console.error("[auth/request-password-reset] failed", error);
    }
  }
}
