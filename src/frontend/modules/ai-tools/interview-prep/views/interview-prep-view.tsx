import { PageHeader } from "@/frontend/shared/ui";

import { InterviewPrepTool } from "../components/interview-prep-tool";

export function InterviewPrepView() {
  return (
    <>
      <PageHeader
        preview
        title="Interview prep"
        description="The questions you're likely to face for a role, with what a strong answer covers."
      />
      <InterviewPrepTool />
    </>
  );
}
