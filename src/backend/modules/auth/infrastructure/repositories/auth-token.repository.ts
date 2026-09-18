import "server-only";

import type {
  AuthToken,
  AuthTokenPurpose,
} from "../../domain/entities/auth-token.entity";
import type {
  AuthTokenRepository,
  CreateAuthTokenInput,
} from "../../domain/ports/auth-token.repository";
import { AUTH_TOKEN_COLUMNS, toAuthToken, type AuthTokenRow } from "../mappers";
import { query, queryOne } from "../database";

export class PgAuthTokenRepository implements AuthTokenRepository {
  async create(input: CreateAuthTokenInput): Promise<AuthToken> {
    const rows = await query<AuthTokenRow>(
      `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING ${AUTH_TOKEN_COLUMNS}`,
      [input.userId, input.tokenHash, input.purpose, input.expiresAt],
    );
    return toAuthToken(rows[0]);
  }

  /**
   * Returns consumed and expired tokens too, so the caller can distinguish
   * "already used" from "never existed" and report the more helpful message.
   */
  async findByHash(hash: string): Promise<AuthToken | null> {
    const row = await queryOne<AuthTokenRow>(
      `SELECT ${AUTH_TOKEN_COLUMNS} FROM auth_tokens WHERE token_hash = $1`,
      [hash],
    );
    return row ? toAuthToken(row) : null;
  }

  /**
   * A single conditional UPDATE, not a read followed by a write.
   *
   * `consumed_at IS NULL` is what makes the token single-use: two requests
   * carrying the same link race on this one statement, and Postgres lets
   * exactly one of them match. A read-then-write would let both pass the check
   * before either wrote, which for a password-reset link means the second
   * visitor also gets to set a password.
   *
   * The expiry check stays with the caller — the domain decides what "expired"
   * means, and this needs to succeed-or-not purely on single-use.
   */
  async consume(tokenId: string, at: Date): Promise<boolean> {
    const rows = await query<{ id: string }>(
      `UPDATE auth_tokens
          SET consumed_at = $2
        WHERE id = $1
          AND consumed_at IS NULL
        RETURNING id`,
      [tokenId, at],
    );
    return rows.length === 1;
  }

  /**
   * Retires outstanding tokens of the same purpose, so requesting a second
   * reset link invalidates the first. Without this every link ever mailed stays
   * live until its own expiry, which multiplies the window in which one can be
   * found in an inbox.
   */
  async invalidateOutstanding(
    userId: string,
    purpose: AuthTokenPurpose,
    at: Date,
  ): Promise<void> {
    await query(
      `UPDATE auth_tokens
          SET consumed_at = $3
        WHERE user_id = $1
          AND purpose = $2
          AND consumed_at IS NULL`,
      [userId, purpose, at],
    );
  }
}
