/**
 * The session being rotated had already been revoked by a concurrent request.
 *
 * ── Why this is a domain exception ──────────────────────────
 * It looks like a storage detail — a lost race on an UPDATE — and it first
 * lived in `infrastructure/repositories`. That was wrong: it is part of
 * `SessionRepository.rotate`'s contract, and the application layer has to catch
 * it to implement reuse handling. Leaving it in infrastructure forced
 * `application/` to import from `infrastructure/`, inverting the dependency the
 * ports exist to keep pointing inward.
 *
 * Any implementation of `rotate` must raise this when the target session is no
 * longer live, whatever storage it uses.
 *
 * Deliberately not an `AuthException`: it carries no message for the user. The
 * caller translates it — in practice into `SessionReuseDetectedException`,
 * since a token spent twice is a token spent twice regardless of which write
 * noticed.
 */
export class SessionRotationConflictException extends Error {
  constructor(readonly sessionId: string) {
    super(`session ${sessionId} was already revoked during rotation`);
    this.name = "SessionRotationConflictException";
  }
}
