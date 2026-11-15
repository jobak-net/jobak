import { NextResponse } from "next/server";

import { getJobCatalogueModule } from "@/backend/modules/job-catalogue";
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

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  let fields: JobField[];
  try {
    fields = await getJobCatalogueModule().listFields.execute();
  } catch (error) {
    console.error("[api/job-fields] could not list the catalogue", error);
    return NextResponse.json({ error: "Could not load job fields" }, { status: 503, headers: noStore });
  }

  return NextResponse.json(fields, { headers: noStore });
}
