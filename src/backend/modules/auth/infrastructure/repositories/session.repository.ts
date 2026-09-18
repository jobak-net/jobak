import "server-only";

import type { Session } from "../../domain/entities/session.entity";
import type {
  CreateSessionInput,
  SessionRepository,
} from "../../domain/ports/session.repository";
import { SESSION_COLUMNS, toSession, type SessionRow } from "../mappers";
import { query, queryOne, transaction } from "../database";
import { SessionRotationConflictException } from "../../domain/exceptions";

const INSERT_SESSION = `
  INSERT INTO sessions (user_id, refresh_token_hash, expires_at, user_agent, ip_address)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING ${SESSION_COLUMNS}
`;

const insertParams = (input: CreateSessionInput) => [
  input.userId,
  input.refreshTokenHash,
  input.expiresAt,
  input.userAgent,
  input.ipAddress,
];

export class PgSessionRepository implements SessionRepository {
  async create(input: CreateSessionInput): Promise<Session> {
    const rows = await query<SessionRow>(INSERT_SESSION, insertParams(input));
    return toSession(rows[0]);
  }

  async findById(id: string): Promise<Session | null> {
    const row = await queryOne<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM sessions WHERE id = $1`,
      [id],
    );
    return row ? toSession(row) : null;
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    /*
     * Deliberately returns revoked and expired rows too. The caller needs to
     * tell "no such token" from "a token that was valid and has been rotated" —
     * the second is the reuse signal, and filtering it out here would make
     * theft detection impossible.
     */
    const row = await queryOne<SessionRow>(
      `SELECT ${SESSION_COLUMNS} FROM sessions WHERE refresh_token_hash = $1`,
      [hash],
    );
    return row ? toSession(row) : null;
  }

  /**
   * Revoke the presented session and issue its replacement, as one unit.
   *
   * Both statements run on the same client inside a transaction: a crash
   * between them would otherwise either strand the user with a revoked token
   * and no successor, or leave two live tokens where there should be one.
   */
  async rotate(sessionId: string, next: CreateSessionInput): Promise<Session> {
    return transaction(async (client) => {
      const inserted = await client.query<SessionRow>(
        INSERT_SESSION,
        insertParams(next),
      );
      const replacement = inserted.rows[0];

      /*
       * `revoked_at IS NULL` makes this the point where a race is settled. Two
       * concurrent refreshes with the same token both insert a replacement, but
       * only one can revoke the parent; the loser matches zero rows, rolls back
       * its insert, and is reported as reuse.
       *
       * Without the guard the second would silently overwrite `replaced_by`,
       * leaving an orphaned live session and no reuse signal at all.
       */
      const revoked = await client.query(
        `UPDATE sessions
            SET revoked_at = NOW(), replaced_by = $2
          WHERE id = $1
            AND revoked_at IS NULL`,
        [sessionId, replacement.id],
      );

      if (revoked.rowCount === 0) {
        // Throwing rolls back the replacement inserted above.
        throw new SessionRotationConflictException(sessionId);
      }

      return toSession(replacement);
    });
  }

  async revoke(sessionId: string, at: Date): Promise<void> {
    await query(
      `UPDATE sessions
          SET revoked_at = $2
        WHERE id = $1
          AND revoked_at IS NULL`,
      [sessionId, at],
    );
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await query(
      `UPDATE sessions
          SET revoked_at = $2
        WHERE user_id = $1
          AND revoked_at IS NULL`,
      [userId, at],
    );
  }

  /**
   * Best-effort bookkeeping, so it is deliberately not awaited by callers in a
   * way that could fail a refresh. A missing `last_used_at` is a diagnostic
   * inconvenience; a failed sign-in because of one would not be.
   */
  async touchLastUsed(sessionId: string, at: Date): Promise<void> {
    await query(`UPDATE sessions SET last_used_at = $2 WHERE id = $1`, [
      sessionId,
      at,
    ]);
  }
}

