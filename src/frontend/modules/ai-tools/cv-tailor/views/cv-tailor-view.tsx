import { PageHeader } from "@/frontend/shared/ui";

import { CvTailorTool } from "../components/cv-tailor-tool";

export function CvTailorView() {
  return (
    <>
      <PageHeader
        preview
        title="Tailor your CV to a job"
        description="Paste a job description and get a version of your CV written for it. Same experience, framed for the role."
      />
      <CvTailorTool />
    </>
  );
}
