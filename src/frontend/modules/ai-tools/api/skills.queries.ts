"use client";

import { useGenericQuery } from "@/frontend/shared/api";

import { fetchSkillVersion, skillVersionKey } from "./skills.api";

/**
 * One version of a skill, fetched when `enabled` (the popup is open). A
 * released version never changes (the skills repository's README), so once
 * fetched it's kept for the rest of the visit: switching back to it costs no request.
 */
export function useSkillVersion(skill: string, version: string, enabled: boolean) {
  return useGenericQuery(skillVersionKey(skill, version), () => fetchSkillVersion(skill, version), {
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
