import { CvMatchTool } from "@/frontend/components/dashboard/tools/cv-match";
import { PageHeader } from "@/frontend/components/ui";

export default function CvMatchPage() {
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
