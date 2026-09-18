import "server-only";

import type { User } from "../../domain/entities/user.entity";

/**
 * `users` row → `User` entity.
 *
 * The row type, the mapping and the column list live together so a schema
 * change touches one file: rename a column and the SELECT, the row type and the
 * mapper all sit in front of you.
 */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  full_name: string | null;
  /*
   * `pg` parses TIMESTAMPTZ into a JavaScript Date already, so these arrive as
   * Dates rather than strings. Worth stating because it is the opposite of what
   * most drivers do, and code that defensively re-parses them ends up with
   * `Invalid Date`.
   */
  email_verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** Keeps a SELECT and its row type from drifting apart. */
export const USER_COLUMNS =
  "id, email, password_hash, full_name, email_verified_at, created_at, updated_at";

export const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  passwordHash: row.password_hash,
  fullName: row.full_name,
  emailVerifiedAt: row.email_verified_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
