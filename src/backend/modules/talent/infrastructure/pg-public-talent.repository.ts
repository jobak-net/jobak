import "server-only";

import { query } from "@/backend/shared/database";
import type { TalentCard } from "@/shared/contracts/talent";

import type { PublicTalentRepository } from "../domain/public-talent.repository";

/**
 * Reads the `public_talent` **view** (010_public_profiles.sql), never the
 * `user_profiles` table.
 *
 * The view is the consent boundary: it only holds rows whose owner switched
 * them on, and blanks each field the owner chose to hide. This connection
 * could read the base table, so reading only the view is what keeps this
 * endpoint from ever widening what someone agreed to show.
 */
export class PgPublicTalentRepository implements PublicTalentRepository {
    list(limit: number): Promise<TalentCard[]> {
        return query<TalentCard & Record<string, unknown>>(
            `SELECT slug,
                    display_name     AS "displayName",
                    headline,
                    bio,
                    linkedin_url     AS "linkedinUrl",
                    github_url       AS "githubUrl",
                    website_url      AS "websiteUrl",
                    location_label   AS "location",
                    field,
                    skills,
                    experience_years AS "experienceYears",
                    seniority,
                    open_to          AS "openTo"
               FROM public_talent
              ORDER BY published_at DESC
              LIMIT $1`,
            [limit],
        );
    }
}
