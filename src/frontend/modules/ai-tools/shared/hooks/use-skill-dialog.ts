"use client";

import { useState } from "react";

import { errorMessageOf } from "@/frontend/shared/api";
import type { SkillVersionsResponse } from "@/shared/contracts/skills";

import { useSkillVersion } from "../../api/skills.queries";

const FILE_NAME = "SKILL.md";

/**
 * The "Use in your own AI" popup's state: open or not, which version is picked
 * (the latest by default), its content (fetched on open, cached per version),
 * and copy / download of that version.
 */
export function useSkillDialog(skill: SkillVersionsResponse) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(skill.latest);
  const [copied, setCopied] = useState(false);
  const query = useSkillVersion(skill.skill, version, open);

  const content = query.data?.content ?? null;
  const info = skill.versions.find((v) => v.version === version) ?? skill.versions[0]!;

  function pick(next: string) {
    setVersion(next);
    setCopied(false);
  }

  /** Copies the picked version; false when the clipboard is blocked, so the caller can select the text instead. */
  async function copy(): Promise<boolean> {
    if (!content) return false;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      return false;
    }
  }

  function download() {
    if (!content) return;
    const url = URL.createObjectURL(new Blob([content], { type: "text/markdown;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: FILE_NAME });
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    version,
    info,
    isLatest: version === skill.latest,
    pick,
    content,
    loading: query.isPending && open,
    error: query.isError ? errorMessageOf(query.error) : null,
    retry: () => void query.refetch(),
    copied,
    copy,
    download,
    fileName: FILE_NAME,
  };
}
