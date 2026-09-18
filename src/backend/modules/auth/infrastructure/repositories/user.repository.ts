import "server-only";

import type { User } from "../../domain/entities/user.entity";
import { EmailTakenException } from "../../domain/exceptions";
import type {
  CreateUserInput,
  UserRepository,
} from "../../domain/ports/user.repository";
import { USER_COLUMNS, toUser, type UserRow } from "../mappers";
import { query, queryOne } from "../database";

/** Postgres raises this on a unique index violation. */
const UNIQUE_VIOLATION = "23505";

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === UNIQUE_VIOLATION;

export class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return row ? toUser(row) : null;
  }

  /**
   * No `LOWER()` and no normalisation: `users.email` is CITEXT, so `=` is
   * already case-insensitive and can still use the unique index. Lowercasing
   * the parameter here would be harmless but misleading — and lowercasing on
   * *insert* would be a real bug, since it would change what the user sees.
   */
  async findByEmail(email: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
      [email],
    );
    return row ? toUser(row) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    try {
      const rows = await query<UserRow>(
        `INSERT INTO users (email, password_hash, full_name)
         VALUES ($1, $2, $3)
         RETURNING ${USER_COLUMNS}`,
        [input.email, input.passwordHash, input.fullName],
      );
      return toUser(rows[0]);
    } catch (error) {
      /*
       * Let the unique index decide, rather than SELECT-then-INSERT. Two
       * simultaneous registrations for the same address would both pass a
       * prior existence check and one would then fail anyway — this way the
       * race simply cannot produce two accounts.
       *
       * Translated here so callers deal in domain exceptions and never need to
       * know Postgres error codes.
       */
      if (isUniqueViolation(error)) throw new EmailTakenException();
      throw error;
    }
  }

  /**
   * Idempotent by design: the WHERE clause skips rows already verified, so a
   * link clicked twice does not move the timestamp and rewrite history.
   */
  async markEmailVerified(userId: string, at: Date): Promise<void> {
    await query(
      `UPDATE users
          SET email_verified_at = $2
        WHERE id = $1
          AND email_verified_at IS NULL`,
      [userId, at],
    );
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
      userId,
      passwordHash,
    ]);
  }
}
