import { CvReviewTool } from "@/frontend/components/dashboard/tools/cv-review";
import { PageHeader } from "@/frontend/components/ui";

export default function CvReviewPage() {
  return (
    <>
      <PageHeader
        preview
        title="CV review"
        description="A score for your CV, the ATS problems that would filter it out, and what to change."
      />
      <CvReviewTool />
    </>
  );
}
