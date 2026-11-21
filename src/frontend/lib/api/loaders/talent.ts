import "server-only";

import { serverFetch } from "@/frontend/lib/api/server-fetch";
import { TALENT_API_PATH, type TalentCard } from "@/shared/contracts/talent";

/**
 * The public talent directory for `/talent` (`GET /api/v1/talent`).
 *
 * An empty list when it couldn't be read, as before: the page then says nobody
 * has published yet rather than failing. (`serverFetch` logs the failure.)
 */
export async function loadTalent(): Promise<TalentCard[]> {
  const result = await serverFetch<TalentCard[]>(TALENT_API_PATH);
  return result.kind === "ok" ? result.data : [];
}
