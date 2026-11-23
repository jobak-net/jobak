import "server-only";

import { getIntegrationsModule } from "@/backend/modules/integrations";

import { WriteCoverLetterUseCase } from "./cover-letter/application/write-cover-letter.use-case";
import { PreferencesProfileReader } from "./cover-letter/infrastructure/preferences-profile.reader";
import { GetSkillVersionUseCase, ListSkillVersionsUseCase } from "./skills/application/skill.use-cases";
import { GitHubSkillRepository } from "./skills/infrastructure/github-skill.repository";

/**
 * The AI tools module's composition root: one use case per tool, each in its
 * own folder (`cover-letter/`, and next CV review, CV tailoring…). Every tool
 * gets its AI the same way — `clientForUser` from the integrations module —
 * so none of them knows which provider it runs on.
 */
export interface AiToolsModule {
  /** `POST /api/v1/ai-tools/cover-letter`. */
  coverLetter: WriteCoverLetterUseCase;
  /** "Use in your own AI": the versioned skills, read from their GitHub repository (jobak-net/career-agent-skills). */
  skills: {
    /** `GET /api/v1/ai-tools/skills/[skill]`. */
    list: ListSkillVersionsUseCase;
    /** `GET /api/v1/ai-tools/skills/[skill]/versions/[version]`. */
    get: GetSkillVersionUseCase;
  };
}

const VERSION = 4;

const globalForAiTools = globalThis as unknown as {
  aiToolsModule?: AiToolsModule;
  aiToolsModuleVersion?: number;
};

export function getAiToolsModule(): AiToolsModule {
  if (!globalForAiTools.aiToolsModule || globalForAiTools.aiToolsModuleVersion !== VERSION) {
    const integrations = getIntegrationsModule();
    const skills = new GitHubSkillRepository();
    globalForAiTools.aiToolsModule = {
      coverLetter: new WriteCoverLetterUseCase(new PreferencesProfileReader(), (userId, provider) =>
        integrations.ai.clientForUser.execute(userId, { provider }),
      ),
      skills: { list: new ListSkillVersionsUseCase(skills), get: new GetSkillVersionUseCase(skills) },
    };
    globalForAiTools.aiToolsModuleVersion = VERSION;
  }
  return globalForAiTools.aiToolsModule;
}
