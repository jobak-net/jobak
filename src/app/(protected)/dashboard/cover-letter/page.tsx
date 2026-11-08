import { CoverLetterTool } from "@/frontend/components/dashboard/tools/cover-letter";
import { PageHeader } from "@/frontend/components/ui";

export default function CoverLetterPage() {
  return (
    <>
      <PageHeader
        preview
        title="Cover letter"
        description="A first draft written for the exact role and company, in the tone you choose. Edit it before you send it."
      />
      <CoverLetterTool />
    </>
  );
}
