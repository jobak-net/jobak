import { CvTailorTool } from "@/frontend/components/dashboard/tools/cv-tailor";
import { PageHeader } from "@/frontend/components/ui";

export default function CvTailorPage() {
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
