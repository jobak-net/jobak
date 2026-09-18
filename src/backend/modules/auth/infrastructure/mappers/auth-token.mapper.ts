import "server-only";

import type {
  AuthToken,
  AuthTokenPurpose,
} from "../../domain/entities/auth-token.entity";

/** `auth_tokens` row → `AuthToken` entity. */

export interface AuthTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  purpose: AuthTokenPurpose;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export const AUTH_TOKEN_COLUMNS =
  "id, user_id, token_hash, purpose, expires_at, consumed_at, created_at";

/**
 * Note `token_hash` is deliberately not carried onto the entity. Nothing in the
 * domain needs it — lookups happen *by* hash — and leaving it off means it
 * cannot be logged or serialised by accident.
 */
export const toAuthToken = (row: AuthTokenRow): AuthToken => ({
  id: row.id,
  userId: row.user_id,
  purpose: row.purpose,
  expiresAt: row.expires_at,
  consumedAt: row.consumed_at,
  createdAt: row.created_at,
});
