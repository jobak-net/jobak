import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { CvReviewTool } from "../components/cv-review-tool";
import { SkillButton } from "../../shared/components/skill-dialog";

/** /dashboard/cv-review — the page's data comes from `loadCvReviewPage` (`../api/cv-review.loader.ts`). */
export function CvReviewView({
  defaults,
  ai,
  skill,
  savedCvs,
}: {
  defaults: { targetRole: string; name: string };
  ai: AiSettingsResponse | null;
  /** Their saved CVs, most recently used first. */
  savedCvs: SavedCv[];
  /** The skill's versions, for "Use in your own AI"; the header button is hidden without them. */
  skill: SkillVersionsResponse | null;
}) {
  return (
    <>
      <PageHeader
        title="CV review"
        description="A score for your CV, what an ATS makes of it, what to fix, and an improved version written by your own AI without inventing anything."
        actions={skill ? <SkillButton skill={skill} /> : undefined}
      />
      <CvReviewTool defaults={defaults} ai={ai} savedCvs={savedCvs} />
    </>
  );
}
