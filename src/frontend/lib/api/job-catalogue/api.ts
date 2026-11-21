import { JOB_TITLES_API_PATH, type JobTitleMatch } from "@/shared/contracts/job-catalogue";

import { clientFetch } from "../client-fetch";
import { unwrap } from "../config";

/*************** Queries ***************/

/** The TanStack Query key for a title search: the API path, then its parameters. */
export const jobTitleSearchKey = (q: string, field: string | null) => [JOB_TITLES_API_PATH, q, field] as const;

/** Type-ahead search over the job title catalogue: `GET /api/v1/job-titles?q=…&field=…`. */
export async function searchJobTitles(q: string, field: string | null): Promise<JobTitleMatch[]> {
    const params = new URLSearchParams({ q });
    if (field) params.set("field", field);
    return unwrap(await clientFetch<JobTitleMatch[]>(`${JOB_TITLES_API_PATH}?${params}`));
}
