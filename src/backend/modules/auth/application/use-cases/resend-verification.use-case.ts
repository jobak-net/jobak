import { isEmailVerified } from "../../domain/entities/user.entity";
import { emailVerificationExpiry } from "../../domain/policies/token-lifetimes.policy";
import type { AuthTokenRepository } from "../../domain/ports/auth-token.repository";
import type { EmailSender } from "../../domain/ports/email-sender.port";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import type { VerificationLinkBuilder } from "../services/link-builder.service";

/**
 * Send a fresh verification link.
 *
 * Necessary rather than optional: since login now refuses unverified accounts,
 * a verification email that goes astray locks someone out permanently without
 * this. It is the escape hatch that makes the strictness acceptable.
 *
 * ── Always reports success ──────────────────────────────────
 * Unknown address, already-verified account, mail failure — all produce the
 * same "if that address has an unverified account, we've sent a link" outcome.
 * Anything else would make this endpoint an account oracle, and it is
 * unauthenticated, so it is the easiest one to probe.
 */
export class ResendVerificationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly authTokens: AuthTokenRepository,
    private readonly tokens: TokenService,
    private readonly email: EmailSender,
    private readonly links: VerificationLinkBuilder,
  ) {}

  async execute(rawEmail: unknown): Promise<void> {
    /*
     * `tryCreate`, not `create` — a malformed address is treated as "no such
     * account" rather than reported, keeping every input on the same path.
     */
    const email = Email.tryCreate(rawEmail);
    if (!email) return;

    try {
      const user = await this.users.findByEmail(email.value);

      // Nothing to do for an unknown address or an already-confirmed one. Both
      // return quietly.
      if (!user || isEmailVerified(user)) return;

      /*
       * Retire any outstanding link before issuing a new one. Otherwise every
       * press of "resend" leaves another live token in someone's inbox, each
       * good for 24 hours — so the number of valid links grows with the number
       * of times a frustrated user clicks the button.
       */
      await this.authTokens.invalidateOutstanding(
        user.id,
        "email_verification",
        new Date(),
      );

      const token = this.tokens.generateRefreshToken();

      await this.authTokens.create({
        userId: user.id,
        tokenHash: token.hash,
        purpose: "email_verification",
        expiresAt: emailVerificationExpiry(),
      });

      await this.email.sendEmailVerification({
        to: user.email,
        fullName: user.fullName,
        link: this.links.emailVerification(token.token),
      });
    } catch (error) {
      // Swallowed for the same reason as above: a failure here must not be
      // distinguishable from a success by the caller.
      console.error("[auth/resend-verification] failed", error);
    }
  }
}
