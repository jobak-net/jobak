import "server-only";

import { getIntegrationsModule, type AiProviderId } from "@/backend/modules/integrations";

import { WriteCoverLetterUseCase } from "./cover-letter/application/write-cover-letter.use-case";
import { ImproveCvUseCase } from "./cv-review/application/improve-cv.use-case";
import { ReviewCvUseCase } from "./cv-review/application/review-cv.use-case";
import { AnalyzeCvFitUseCase } from "./cv-tailor/application/analyze-cv-fit.use-case";
import { TailorCvUseCase } from "./cv-tailor/application/tailor-cv.use-case";
import { PreferencesProfileReader } from "./shared/infrastructure/preferences-profile.reader";
import { GetSkillVersionUseCase, ListSkillVersionsUseCase } from "./skills/application/skill.use-cases";
import { GitHubSkillRepository } from "./skills/infrastructure/github-skill.repository";

/**
 * The AI tools module's composition root: one use case per tool, each in its
 * own folder (`cover-letter/`, `cv-review/`, `cv-tailor/`). Every tool
 * gets its AI the same way — `clientForUser` from the integrations module —
 * so none of them knows which provider it runs on.
 */
export interface AiToolsModule {
  /** `POST /api/v1/ai-tools/cover-letter`. */
  coverLetter: WriteCoverLetterUseCase;
  cvReview: {
    /** `POST /api/v1/ai-tools/cv-review`. */
    review: ReviewCvUseCase;
    /** `POST /api/v1/ai-tools/cv-review/improve`. */
    improve: ImproveCvUseCase;
  };
  cvTailor: {
    /** `POST /api/v1/ai-tools/cv-tailor/analyze`. */
    analyze: AnalyzeCvFitUseCase;
    /** `POST /api/v1/ai-tools/cv-tailor`. */
    tailor: TailorCvUseCase;
  };
  /** "Use in your own AI": the versioned skills, read from their GitHub repository (jobak-net/career-agent-skills). */
  skills: {
    /** `GET /api/v1/ai-tools/skills/[skill]`. */
    list: ListSkillVersionsUseCase;
    /** `GET /api/v1/ai-tools/skills/[skill]/versions/[version]`. */
    get: GetSkillVersionUseCase;
  };
}

const VERSION = 6;

const globalForAiTools = globalThis as unknown as {
  aiToolsModule?: AiToolsModule;
  aiToolsModuleVersion?: number;
};

export function getAiToolsModule(): AiToolsModule {
  if (!globalForAiTools.aiToolsModule || globalForAiTools.aiToolsModuleVersion !== VERSION) {
    const integrations = getIntegrationsModule();
    const skills = new GitHubSkillRepository();
    const profiles = new PreferencesProfileReader();
    const aiFor = (userId: string, provider: AiProviderId) => integrations.ai.clientForUser.execute(userId, { provider });
    globalForAiTools.aiToolsModule = {
      coverLetter: new WriteCoverLetterUseCase(profiles, aiFor),
      cvReview: { review: new ReviewCvUseCase(profiles, aiFor), improve: new ImproveCvUseCase(profiles, aiFor) },
      cvTailor: { analyze: new AnalyzeCvFitUseCase(aiFor), tailor: new TailorCvUseCase(aiFor) },
      skills: { list: new ListSkillVersionsUseCase(skills), get: new GetSkillVersionUseCase(skills) },
    };
    globalForAiTools.aiToolsModuleVersion = VERSION;
  }
  return globalForAiTools.aiToolsModule;
}
