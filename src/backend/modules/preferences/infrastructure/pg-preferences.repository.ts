import "server-only";

import { query, queryOne } from "@/backend/shared/database";

import type { JobPreferences, JobType, Seniority, StoredPreferences, WorkMode } from "../domain/job-preferences";
import type { PreferencesRepository } from "../domain/preferences.repository";

interface PreferencesRow {
    work_preference: string[] | null;
    location: { worldwide?: boolean; countries?: string[] } | null;
    job_titles: string[] | null;
    skills: string[] | null;
    job_types: string[] | null;
    seniority: string | null;
    field: string | null;
    onboarding_completed: boolean;
}

/**
 * `user_preferences`, over the app's own Postgres connection.
 *
 * Column names are the table's historical ones; this file is the only place
 * that knows them. `skills` holds what the app calls keywords, and
 * `work_preference` the work modes.
 */
export class PgPreferencesRepository implements PreferencesRepository {
    async hasCompletedOnboarding(userId: string): Promise<boolean> {
        const row = await queryOne<{ onboarding_completed: boolean }>(
            `SELECT onboarding_completed FROM user_preferences WHERE user_id = $1`,
            [userId],
        );
        return row?.onboarding_completed === true;
    }

    async findByUserId(userId: string): Promise<StoredPreferences | null> {
        const row = await queryOne<PreferencesRow>(
            `SELECT work_preference, location, job_titles, skills, job_types, seniority, field, onboarding_completed
               FROM user_preferences
              WHERE user_id = $1`,
            [userId],
        );
        if (!row) return null;

        return {
            location: {
                worldwide: Boolean(row.location?.worldwide),
                countries: row.location?.countries ?? [],
            },
            workModes: (row.work_preference ?? []) as WorkMode[],
            jobTitles: row.job_titles ?? [],
            keywords: row.skills ?? [],
            jobTypes: (row.job_types ?? []) as JobType[],
            seniority: row.seniority as Seniority | null,
            field: row.field,
            onboardingCompleted: row.onboarding_completed,
        };
    }

    /**
     * One upsert. `onboarding_completed` is OR-ed with its current value, so a
     * save that is not completing onboarding leaves a completed flag alone.
     */
    async save(userId: string, p: JobPreferences, { completeOnboarding }: { completeOnboarding: boolean }): Promise<void> {
        await query(
            `INSERT INTO user_preferences
                    (user_id, location, work_preference, job_titles, skills, job_types, seniority, field, onboarding_completed)
             VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id) DO UPDATE
                SET location             = EXCLUDED.location,
                    work_preference      = EXCLUDED.work_preference,
                    job_titles           = EXCLUDED.job_titles,
                    skills               = EXCLUDED.skills,
                    job_types            = EXCLUDED.job_types,
                    seniority            = EXCLUDED.seniority,
                    field                = EXCLUDED.field,
                    onboarding_completed = user_preferences.onboarding_completed OR EXCLUDED.onboarding_completed`,
            [
                userId,
                JSON.stringify({ worldwide: p.location.worldwide, countries: p.location.countries }),
                p.workModes,
                p.jobTitles,
                p.keywords,
                p.jobTypes,
                p.seniority,
                p.field,
                completeOnboarding,
            ],
        );
    }
}
