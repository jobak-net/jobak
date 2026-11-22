import { PageHeader } from "@/frontend/shared/ui";

import { CvMatchTool } from "../components/cv-match-tool";

export function CvMatchView() {
  return (
    <>
      <PageHeader
        preview
        title="Jobs that fit your CV"
        description="Skip the preferences form: upload your CV and we'll rank open jobs against what's actually in it."
      />
      <CvMatchTool />
    </>
  );
}
