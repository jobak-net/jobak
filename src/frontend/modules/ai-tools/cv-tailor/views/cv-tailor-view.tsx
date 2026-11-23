import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { CvTailorTool } from "../components/cv-tailor-tool";
import { SkillButton } from "../../shared/components/skill-dialog";

/** /dashboard/cv-tailor — the page's data comes from `loadCvTailorPage` (`../api/cv-tailor.loader.ts`). */
export function CvTailorView({
  name,
  ai,
  skill,
  savedCvs,
}: {
  name: string;
  ai: AiSettingsResponse | null;
  /** The skill's versions, for "Use in your own AI"; the header button is hidden without them. */
  skill: SkillVersionsResponse | null;
  /** Their saved CVs, most recently used first. */
  savedCvs: SavedCv[];
}) {
  return (
    <>
      <PageHeader
        title="Tailor CV to a job"
        description="How your CV fits one job, requirement by requirement, then a version written for that role by your own AI, without inventing anything."
        actions={skill ? <SkillButton skill={skill} /> : undefined}
      />
      <CvTailorTool name={name} ai={ai} savedCvs={savedCvs} />
    </>
  );
}
