import { NotFoundError } from "@/backend/shared/exceptions";
import type { SkillVersionResponse, SkillVersionsResponse } from "@/shared/contracts/skills";

import { compareVersionsDesc, type SkillRepository } from "../domain/skill";

/** `GET /api/v1/ai-tools/skills/[skill]`: the skill and its versions, newest first. */
export class ListSkillVersionsUseCase {
  constructor(private readonly skills: SkillRepository) {}

  async execute(skill: string): Promise<SkillVersionsResponse> {
    const manifest = await this.skills.manifest(skill);
    if (!manifest) throw new NotFoundError(`No skill "${skill}"`);

    const versions = [...manifest.versions].sort((a, b) => compareVersionsDesc(a.version, b.version));
    const latest = versions.some((v) => v.version === manifest.latest) ? manifest.latest : versions[0]!.version;
    return { skill, title: manifest.title, description: manifest.description, latest, versions };
  }
}

/**
 * `GET /api/v1/ai-tools/skills/[skill]/versions/[version]`: one version's
 * `SKILL.md`. Only versions listed in the manifest are served, so an unlisted
 * draft folder stays private. A listed version with no file is a 404 here and
 * logged, since it means the manifest and the folders disagree.
 */
export class GetSkillVersionUseCase {
  constructor(private readonly skills: SkillRepository) {}

  async execute(skill: string, version: string): Promise<SkillVersionResponse> {
    const manifest = await this.skills.manifest(skill);
    if (!manifest) throw new NotFoundError(`No skill "${skill}"`);
    if (!manifest.versions.some((v) => v.version === version)) {
      throw new NotFoundError(`No version ${version} of "${skill}"`);
    }

    const content = await this.skills.content(skill, version);
    if (content === null) {
      console.error(`[skills] ${skill} ${version} is listed in skill.json but versions/${version}/SKILL.md is missing`);
      throw new NotFoundError(`No file for version ${version} of "${skill}"`);
    }
    return { skill, version, content };
  }
}
