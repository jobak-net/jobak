import { Plus } from "lucide-react";

import { SAMPLE_APPLICATIONS } from "@/frontend/shared/mocks/dashboard";
import { Button, PageHeader } from "@/frontend/shared/ui";

import { ApplicationsBoard } from "../components/applications-board";

/** /dashboard/applications — the tracker, on sample data until applications are stored. */
export function ApplicationsView() {
  return (
    <>
      <PageHeader
        preview="Preview. You can move cards between stages, but nothing is saved yet."
        title="Applications"
        description="Track every job you apply for, from saved to offer."
        actions={
          <Button variant="primary" size="sm" disabled title="Coming soon">
            <Plus /> Add application
          </Button>
        }
      />
      <ApplicationsBoard initial={SAMPLE_APPLICATIONS} />
    </>
  );
}
