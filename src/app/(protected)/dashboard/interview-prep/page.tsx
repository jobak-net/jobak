import { InterviewPrepTool } from "@/frontend/components/dashboard/tools/interview-prep";
import { PageHeader } from "@/frontend/components/ui";

export default function InterviewPrepPage() {
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
