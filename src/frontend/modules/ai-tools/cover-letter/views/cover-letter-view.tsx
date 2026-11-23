import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { CoverLetterTool } from "../components/cover-letter-tool";
import { SkillButton } from "../../shared/components/skill-dialog";

/** /dashboard/cover-letter — the page's data comes from `loadCoverLetterPage` (`../api/cover-letter.loader.ts`). */
export function CoverLetterView({
  defaults,
  ai,
  skill,
  savedCvs,
}: {
  defaults: { name: string };
  ai: AiSettingsResponse | null;
  /** Their saved CVs, most recently used first. */
  savedCvs: SavedCv[];
  /** The skill's versions, for "Use in your own AI"; the header button is hidden without them. */
  skill: SkillVersionsResponse | null;
}) {
  return (
    <>
      <PageHeader
        title="Cover letter"
        description="A first draft for the exact role and company, written by your own AI from your skills and the posting. Edit it before you send it."
        actions={skill ? <SkillButton skill={skill} /> : undefined}
      />
      <CoverLetterTool defaults={defaults} ai={ai} savedCvs={savedCvs} />
    </>
  );
}
