import "server-only";

import { query, queryOne } from "@/backend/shared/database";

import type { ExternalIdentity } from "../../domain/entities/identity.entity";
import type { User } from "../../domain/entities/user.entity";
import type { UserRepository } from "../../domain/ports/user.repository";
import { USER_COLUMNS, toUser, type UserRow } from "../mappers/user.mapper";

export class PgUserRepository implements UserRepository {
  async findByExternalId(externalId: string): Promise<User | null> {
    const row = await queryOne<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE external_id = $1`,
      [externalId],
    );
    return row ? toUser(row) : null;
  }

  /**
   * `ON CONFLICT (external_id)` makes first-sight provisioning and webhook
   * updates the same statement, and makes concurrent first requests safe: the
   * loser of the race updates the row the winner just inserted.
   *
   * The `WHERE` on the update skips a write when nothing changed, so the hot
   * path of a retried webhook does not churn `updated_at`.
   */
  async upsert(identity: ExternalIdentity): Promise<User> {
    const rows = await query<UserRow>(
      `INSERT INTO users (external_id, email, full_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (external_id) DO UPDATE
          SET email     = EXCLUDED.email,
              full_name = EXCLUDED.full_name
        WHERE users.email     IS DISTINCT FROM EXCLUDED.email
           OR users.full_name IS DISTINCT FROM EXCLUDED.full_name
       RETURNING ${USER_COLUMNS}`,
      [identity.externalId, identity.email, identity.fullName],
    );

    /*
     * An unchanged conflict returns no row — `RETURNING` only reports rows the
     * statement actually wrote. Read it back rather than treat that as missing.
     */
    if (rows[0]) return toUser(rows[0]);

    const existing = await this.findByExternalId(identity.externalId);
    if (!existing) {
      throw new Error(`user ${identity.externalId} vanished during upsert`);
    }
    return existing;
  }

  async deleteByExternalId(externalId: string): Promise<void> {
    await query(`DELETE FROM users WHERE external_id = $1`, [externalId]);
  }
}
