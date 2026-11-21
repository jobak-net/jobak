import { jobBookmarkApiPath, type JobBookmark } from "@/shared/contracts/jobs";

import { clientFetch } from "../client-fetch";
import { unwrap } from "../config";

/*************** Mutations ***************/

/**
 * Bookmarks a job, or removes the bookmark: `PUT /api/v1/jobs/{jobId}/bookmark`.
 *
 * Sends the value wanted, not "toggle", so a repeated call can't undo itself.
 * Resolves with what the server stored; throws an `ApiError` otherwise.
 */
export async function setBookmark({ jobId, bookmarked }: { jobId: string; bookmarked: boolean }): Promise<JobBookmark> {
    return unwrap(
        await clientFetch<JobBookmark>(jobBookmarkApiPath(jobId), { method: "PUT", body: { bookmarked } satisfies JobBookmark }),
    );
}
