import { PageHeader } from "@/frontend/shared/ui";
import type { AiSettingsResponse } from "@/shared/contracts/ai-settings";
import type { SavedCv } from "@/shared/contracts/applicant";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { HrEmailTool } from "../components/hr-email-tool";
import { SkillButton } from "../../shared/components/skill-dialog";

/** /dashboard/hr-email — the page's data comes from `loadHrEmailPage` (`../api/hr-email.loader.ts`). */
export function HrEmailView({
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
        title="Email to HR"
        description="Applications, follow-ups, interview replies, offers and referrals: a short, natural email written by your own AI, ready to copy or open in your mail app."
        actions={skill ? <SkillButton skill={skill} /> : undefined}
      />
      <HrEmailTool name={name} ai={ai} savedCvs={savedCvs} />
    </>
  );
}
