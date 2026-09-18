import { isUsable } from "../../domain/entities/session.entity";
import type { PublicUser } from "../../domain/entities/user.entity";
import { toPublicUser } from "../../domain/entities/user.entity";
import type { SessionRepository } from "../../domain/ports/session.repository";
import type { TokenService } from "../../domain/ports/token.service.port";
import type { UserRepository } from "../../domain/ports/user.repository";

export interface GetCurrentUserOptions {
  /**
   * Whether to confirm the session is still live, rather than trusting the
   * token's signature alone. See the note on `execute`.
   */
  checkSession?: boolean;
}

/**
 * Resolve an access token to the user it belongs to, or null.
 *
 * This is the read path behind every "is this request authenticated" question,
 * so it runs constantly — which is what shapes the trade-off below.
 *
 * Returns null rather than throwing: an absent or expired token is the ordinary
 * state of a public page, not an error.
 */
export class GetCurrentUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly tokens: TokenService,
  ) {}

  /**
   * `checkSession` trades latency for immediacy of revocation.
   *
   * False means a valid signature is enough — no session lookup, but a
   * signed-out user keeps working access until the access token expires (up to
   * 15 minutes). True confirms the session is still live on every call, so
   * sign-out and reuse-revocation take effect at once, at the cost of a query.
   *
   * Defaults to true: the reason the access token carries `sid` at all is to
   * make revocation possible, and defaulting to the cheaper-but-staler option
   * would waste that. Pass false only where staleness is genuinely acceptable —
   * a cosmetic "signed in as" in a public page header, say.
   */
  async execute(
    accessToken: string | null,
    { checkSession = true }: GetCurrentUserOptions = {},
  ): Promise<PublicUser | null> {
    if (!accessToken) return null;

    const claims = await this.tokens.verifyAccessToken(accessToken);
    if (!claims) return null;

    if (checkSession) {
      const session = await this.sessions.findById(claims.sid);

      /*
       * The session must exist, be live, and belong to the subject named in the
       * token. The last check guards against a token whose `sid` and `sub`
       * disagree — which a valid signature alone would not catch, since we
       * signed both claims ourselves and only their pairing makes them
       * meaningful.
       */
      if (!session || !isUsable(session) || session.userId !== claims.sub) {
        return null;
      }
    }

    const user = await this.users.findById(claims.sub);
    return user ? toPublicUser(user) : null;
  }
}
