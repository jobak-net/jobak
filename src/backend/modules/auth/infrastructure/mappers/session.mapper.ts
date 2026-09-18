import "server-only";

import type { Session } from "../../domain/entities/session.entity";

/** `sessions` row → `Session` entity. */

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_used_at: Date | null;
}

export const SESSION_COLUMNS =
  "id, user_id, refresh_token_hash, expires_at, revoked_at, replaced_by, user_agent, ip_address, created_at, last_used_at";

export const toSession = (row: SessionRow): Session => ({
  id: row.id,
  userId: row.user_id,
  refreshTokenHash: row.refresh_token_hash,
  expiresAt: row.expires_at,
  revokedAt: row.revoked_at,
  replacedBy: row.replaced_by,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
});
