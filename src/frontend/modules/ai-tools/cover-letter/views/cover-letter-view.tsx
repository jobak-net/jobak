import { PageHeader } from "@/frontend/shared/ui";

import { CoverLetterTool } from "../components/cover-letter-tool";

export function CoverLetterView() {
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
