import { PageHeader } from "@/frontend/shared/ui";

import { CvReviewTool } from "../components/cv-review-tool";

export function CvReviewView() {
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
