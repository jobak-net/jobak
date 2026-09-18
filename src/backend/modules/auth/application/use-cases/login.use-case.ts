import { isEmailVerified } from "../../domain/entities/user.entity";
import {
  EmailNotVerifiedException,
  InvalidCredentialsException,
} from "../../domain/exceptions";
import type { PasswordHasher } from "../../domain/ports/password-hasher.port";
import type { UserRepository } from "../../domain/ports/user.repository";
import { Email } from "../../domain/value-objects/email.vo";
import { Password } from "../../domain/value-objects/password.vo";
import type { AuthResult, SessionContext } from "../dto/auth-result.dto";
import type { SessionIssuer } from "../services/session-issuer.service";

export interface LoginInput {
  email: unknown;
  password: unknown;
}

/**
 * A bcrypt hash of a throwaway value, used to spend time on accounts that do
 * not exist.
 *
 * Without it, an unknown address returns as fast as the database can say "no
 * row", while a known one costs ~250ms of hashing. That difference is
 * measurable over the network and turns login into an account oracle — the same
 * leak `InvalidCredentialsException` exists to prevent, reintroduced through
 * timing rather than wording.
 *
 * A real bcrypt hash at cost 12, so the dummy verification costs what a genuine
 * one does. It must stay a valid hash: `verify` returns false rather than
 * throwing on a malformed one, which would make the comparison return
 * immediately and restore the very timing difference this exists to remove.
 *
 * If COST in the hasher changes, regenerate this at the new cost.
 */
const DUMMY_HASH =
  "$2b$12$WW1jptwl/n7sew45Z4qZjuYYWG2pZURGxkQaaZMwBab6/EKTZNADe";

/**
 * Sign in with email and password.
 *
 * ── Unverified addresses cannot sign in ─────────────────────
 * A correct password is not enough: the address must have been confirmed.
 * Registration creates the account but issues no session, so this is the gate
 * that makes verification mean something.
 *
 * The check deliberately happens *after* the password is verified. Refusing an
 * unverified address before checking the password would tell anyone who typed
 * an email that an unverified account exists for it — the enumeration leak
 * again, through a different door. Reaching `EmailNotVerifiedException`
 * requires already knowing the password, so it reveals nothing to a stranger.
 *
 * The cost of this strictness is that a lost verification email locks someone
 * out until they request another, which is why resending must be easy.
 */
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessionIssuer: SessionIssuer,
  ) {}

  async execute(
    input: LoginInput,
    context: SessionContext,
  ): Promise<AuthResult> {
    /*
     * `tryCreate`, not `create`. A malformed address simply has no account —
     * reporting "invalid email" here would distinguish it from an unregistered
     * one, which is the enumeration leak again.
     */
    const email = Email.tryCreate(input.email);

    /*
     * `forVerification`, not `create`. The stored password was set under
     * whatever policy applied at the time, and re-validating it here would lock
     * out anyone whose password predates a tightening of the rules. The only
     * question at login is whether the hash matches.
     */
    const password = Password.forVerification(input.password);

    const user = email ? await this.users.findByEmail(email.value) : null;

    /*
     * Always verify against something, even when there is no user and no
     * password. Returning early would leak both facts through response time.
     */
    const matches = await this.hasher.verify(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    /*
     * `user.passwordHash === null` is an OAuth-only account. It reaches here as
     * a dummy comparison that cannot match, so it fails as ordinary invalid
     * credentials — which is right: telling someone "this account exists but
     * has no password" is another way of confirming the account exists.
     */
    if (!user || !matches) {
      throw new InvalidCredentialsException(
        user ? "password mismatch" : "no account for address",
      );
    }

    /*
     * Only reachable by someone who has just proved they know the password, so
     * it tells an attacker nothing they did not already have.
     */
    if (!isEmailVerified(user)) {
      throw new EmailNotVerifiedException();
    }

    return this.sessionIssuer.issue(user, context);
  }
}
