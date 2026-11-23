import "server-only";

import { query, queryOne, transaction } from "@/backend/shared/database";
import type { CvSource } from "@/shared/contracts/cv-review";

import type { ApplicantRepository } from "../domain/applicant.repository";
import type { NewCv, SavedCvRecord } from "../domain/saved-cv";

interface CvRow {
  id: string;
  label: string;
  source: CvSource;
  pages: number | null;
  content: string;
  created_at: Date;
  last_used_at: Date;
}

const CV_COLUMNS = "id, label, source, pages, content, created_at, last_used_at";

const toRecord = (row: CvRow): SavedCvRecord => ({
  id: row.id,
  label: row.label,
  source: row.source,
  pages: row.pages,
  text: row.content,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
});

/** `user_preferences.applicant_name` and `user_cvs` (migration 025). Every query is scoped to the user. */
export class PgApplicantRepository implements ApplicantRepository {
  async name(userId: string): Promise<string | null> {
    const row = await queryOne<{ applicant_name: string | null }>(
      "SELECT applicant_name FROM user_preferences WHERE user_id = $1",
      [userId],
    );
    return row?.applicant_name ?? null;
  }

  /** UPDATE, never INSERT: the preferences row is created by onboarding, with its required fields. */
  async setName(userId: string, name: string): Promise<boolean> {
    const rows = await query<{ user_id: string }>(
      "UPDATE user_preferences SET applicant_name = $2 WHERE user_id = $1 RETURNING user_id",
      [userId, name],
    );
    return rows.length > 0;
  }

  async listCvs(userId: string): Promise<SavedCvRecord[]> {
    const rows = await query<CvRow>(
      `SELECT ${CV_COLUMNS} FROM user_cvs WHERE user_id = $1 ORDER BY last_used_at DESC, created_at DESC`,
      [userId],
    );
    return rows.map(toRecord);
  }

  /**
   * Insert, or on the same text bump `last_used_at`; then delete all but the
   * `keep` most recently used. In one transaction, so two saves at once can't
   * leave more than `keep` rows.
   */
  async saveCv(userId: string, cv: NewCv, keep: number): Promise<SavedCvRecord> {
    return transaction(async (client) => {
      const saved = await client.query<CvRow>(
        `INSERT INTO user_cvs (user_id, label, content, source, pages, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, content_hash) DO UPDATE SET last_used_at = NOW()
         RETURNING ${CV_COLUMNS}`,
        [userId, cv.label, cv.text, cv.source, cv.pages, cv.hash],
      );
      await client.query(
        `DELETE FROM user_cvs
          WHERE user_id = $1
            AND id NOT IN (SELECT id FROM user_cvs WHERE user_id = $1 ORDER BY last_used_at DESC, created_at DESC LIMIT $2)`,
        [userId, keep],
      );
      return toRecord(saved.rows[0]!);
    });
  }

  async deleteCv(userId: string, id: string): Promise<boolean> {
    const rows = await query<{ id: string }>("DELETE FROM user_cvs WHERE id = $1 AND user_id = $2 RETURNING id", [id, userId]);
    return rows.length > 0;
  }
}
