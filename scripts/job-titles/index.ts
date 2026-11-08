/**
 * Job title catalogue commands
 */

import type { ScriptCategory } from "../types";

export const category: ScriptCategory = {
    name: "Job titles",
    description: "Rebuild the job title catalogue seed from O*NET",
    commands: [
        {
            key: "1",
            description: "Download O*NET and regenerate db/supabase/023_seed_onet_job_titles.sql",
            action: "tsx scripts/job-titles/generate-onet-seed.ts",
        },
    ],
};
