"use server";

import { createServiceClient } from "@/backend/lib/supabase/service";
import { getCurrentUser } from "@/backend/modules/auth/interface";

/*
 * Listing the user's jobs moved to the job-search module, behind
 * `GET /api/v1/jobs`. Only the bookmark toggle is left here, still called
 * directly by the job list.
 */

export async function toggleBookmarkAction(jobId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const service = createServiceClient();

  const { data: existing } = await service
    .from("user_job_matches")
    .select("is_bookmarked")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  const newValue = !(existing?.is_bookmarked ?? false);

  /*
   * Upsert, not update. The dashboard now lists pool jobs the matcher has not
   * scored yet, and those have no match row — an update would report success
   * while changing nothing, and the star would spring back on reload.
   */
  const { error } = await service
    .from("user_job_matches")
    .upsert(
      { user_id: user.id, job_id: jobId, is_bookmarked: newValue },
      { onConflict: "user_id,job_id" }
    );

  if (error) {
    console.error("toggleBookmark error:", error);
    return existing?.is_bookmarked ?? false;
  }

  return newValue;
}
