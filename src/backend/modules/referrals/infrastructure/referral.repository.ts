import "server-only";

import { query } from "@/backend/shared/database";

import type { Referral } from "../domain/referral.entity";
import type { ReferralRepository } from "../domain/ports/referral.repository";

/** "Omar Khaled Hassan" → "Omar H."; one word → itself; nothing → null. */
function displayNameFor(fullName: string | null): string | null {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0]!;
    return `${parts[0]} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.`;
}

export class PgReferralRepository implements ReferralRepository {
    /**
     * Every rule in the WHERE / JOIN, the write in the same statement:
     *
     *   r.referral_code = $2   the code resolves to a user…
     *   r.id <> u.id           …who is not the person signing up
     *   u.created_at > …       the new account is inside the window
     *   ON CONFLICT DO NOTHING the account was not already referred
     *
     * `ORDER BY r.created_at LIMIT 1` settles the (one-in-a-trillion) case of
     * two users sharing a code, in favour of the older account.
     */
    async claim(referredId: string, code: string, windowDays: number): Promise<boolean> {
        const rows = await query<{ id: string }>(
            `INSERT INTO referrals (referrer_id, referred_id)
             SELECT r.id, u.id
               FROM users u
               JOIN users r ON r.referral_code = $2 AND r.id <> u.id
              WHERE u.id = $1
                AND u.created_at > NOW() - make_interval(days => $3)
              ORDER BY r.created_at
              LIMIT 1
             ON CONFLICT (referred_id) DO NOTHING
             RETURNING id`,
            [referredId, code, windowDays],
        );
        return rows.length > 0;
    }

    async listForReferrer(referrerId: string): Promise<Referral[]> {
        const rows = await query<{ full_name: string | null; joined_at: Date }>(
            `SELECT u.full_name, f.created_at AS joined_at
               FROM referrals f
               JOIN users u ON u.id = f.referred_id
              WHERE f.referrer_id = $1
              ORDER BY f.created_at DESC
              LIMIT 200`,
            [referrerId],
        );
        return rows.map((row) => ({ displayName: displayNameFor(row.full_name), joinedAt: row.joined_at }));
    }
}
