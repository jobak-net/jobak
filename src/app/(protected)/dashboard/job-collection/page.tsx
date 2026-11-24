import type { Metadata } from "next";

import { JobCollectionView } from "@/frontend/modules/job-collection";
import { loadJobCollectionPage } from "@/frontend/modules/job-collection/server";

export const metadata: Metadata = { title: "Find jobs elsewhere" };

export default async function JobCollectionPage() {
  const { accountId, country } = await loadJobCollectionPage();
  return <JobCollectionView accountId={accountId} country={country} />;
}
