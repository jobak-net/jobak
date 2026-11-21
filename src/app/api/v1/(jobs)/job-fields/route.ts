import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";
import { withMiddlewares } from "@/backend/shared/http/middlewares/with-middlewares";
import type { JobField } from "@/shared/contracts/job-catalogue";

/**
 * GET /api/v1/job-fields
 *
 * The catalogue's fields, each with a few titles to suggest — the first
 * onboarding question. Contract: `@/shared/contracts/job-catalogue`.
 *
 * No sign-in needed: it's the same catalogue for everyone. The module keeps
 * its own short in-memory cache, and serves the last good copy when the
 * database blips.
 */
export const dynamic = "force-dynamic";

export const GET = withMiddlewares(
  { label: "job-fields.list" },
  async (): Promise<JobField[]> => getJobCatalogueModule().listFields.execute(),
);
