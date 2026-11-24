/**
 * The contract of `/api/v1/ai-tools/skills`: versioned instructions a user can
 * give their own AI to do what a Jobak tool does ("Use in your own AI").
 * Imports only other shared files (see `src/shared/README.md`).
 *
 * GET /skills/[skill]                     → SkillVersionsResponse
 * GET /skills/[skill]/versions/[version]  → SkillVersionResponse
 *   400  { error, code }   not a skill name (`a-z0-9-`) or not a version (`x.y.z`)
 *   401  { error, code }   nobody is signed in
 *   404  { error, code }   no such skill, or no such version of it
 *
 * Files, in the skills repository on GitHub (jobak-net/career-agent-skills,
 * see its README): `<skill>/skill.json` and `<skill>/versions/<x.y.z>/SKILL.md`.
 * A released version never changes, so its content can be cached for good.
 */

/** A skill's name, as in its folder: lowercase letters, digits and dashes. */
export const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A version: `major.minor.patch`. */
export const SKILL_VERSION_PATTERN = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

export const SKILLS_API_PATH = "/api/v1/ai-tools/skills";
export const skillApiPath = (skill: string) => `${SKILLS_API_PATH}/${encodeURIComponent(skill)}`;
export const skillVersionApiPath = (skill: string, version: string) =>
  `${skillApiPath(skill)}/versions/${encodeURIComponent(version)}`;

export interface SkillVersionInfo {
  version: string;
  /** `YYYY-MM-DD`. */
  date: string;
  /** One line on what changed. */
  notes: string;
}

export interface SkillVersionsResponse {
  skill: string;
  title: string;
  description: string;
  /** The version offered by default. */
  latest: string;
  /** Newest first. */
  versions: SkillVersionInfo[];
}

export interface SkillVersionResponse {
  skill: string;
  version: string;
  /** The `SKILL.md`, as written. */
  content: string;
}
