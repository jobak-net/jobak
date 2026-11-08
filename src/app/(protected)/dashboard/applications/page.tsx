import { Plus } from "lucide-react";

import { ApplicationsBoard } from "@/frontend/components/dashboard/applications-board";
import { Button, PageHeader } from "@/frontend/components/ui";
import { SAMPLE_APPLICATIONS } from "@/frontend/lib/mocks/dashboard";

export default function ApplicationsPage() {
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
