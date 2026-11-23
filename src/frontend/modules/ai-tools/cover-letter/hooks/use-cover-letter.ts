"use client";

import { useMemo, useState } from "react";

import type { AiProvider } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import { scanJobPosting } from "@/shared/ai-tools";
import {
  COVER_LETTER_LIMITS as L,
  type CoverLetterResponse,
  type CoverLetterTone,
} from "@/shared/contracts/cover-letter";

import { useWriteCoverLetter } from "../api/cover-letter.mutations";

export interface CoverLetterFields {
  name: string;
  /** Optional: what they've done, in their own words, or their CV. */
  experience: string;
  company: string;
  title: string;
  description: string;
  tone: CoverLetterTone;
}

/**
 * The cover letter tool's state.
 *
 *  - **The form**: the name starts from the account and can be changed for
 *    this letter; what they've done (optional), company, job title, posting
 *    and tone are new. The rest of the profile (skills, target role) the
 *    server reads itself.
 *  - **The posting check** runs as they paste (`scanJobPosting`, shared with
 *    the server), so planted AI traps show before anything is sent.
 *  - **Write** opens the provider popup; confirming sends one request with the
 *    chosen saved key. The result's letter is editable in place.
 */
export function useCoverLetter(defaults: { name: string }) {
  const [fields, setFields] = useState<CoverLetterFields>({
    name: defaults.name,
    experience: "",
    company: "",
    title: "",
    description: "",
    tone: "professional",
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [result, setResult] = useState<CoverLetterResponse | null>(null);
  const [letter, setLetter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const write = useWriteCoverLetter();

  const scan = useMemo(() => scanJobPosting(fields.description), [fields.description]);

  const descriptionLength = fields.description.trim().length;
  /** What still stops the form, in reading order — the first is shown next to the button. */
  const missing = [
    !fields.name.trim() && "your name",
    !fields.company.trim() && "the company",
    !fields.title.trim() && "the job title",
    descriptionLength < L.descriptionMin && "the job posting",
  ].filter((item): item is string => Boolean(item));
  const tooLong = descriptionLength > L.descriptionMax;
  const experienceLength = fields.experience.trim().length;
  const experienceTooLong = experienceLength > L.experienceMax;
  const canWrite = missing.length === 0 && !tooLong && !experienceTooLong && !write.isPending;

  function set<K extends keyof CoverLetterFields>(key: K, value: CoverLetterFields[K]) {
    setFields((all) => ({ ...all, [key]: value }));
    setError(null);
  }

  function openPicker() {
    if (canWrite) setPickerOpen(true);
  }

  function writeWith(provider: AiProvider) {
    setError(null);
    write.mutate(
      {
        provider,
        applicant: { name: fields.name.trim(), ...(experienceLength > 0 && { experience: fields.experience.trim() }) },
        job: { company: fields.company.trim(), title: fields.title.trim(), description: fields.description },
        tone: fields.tone,
      },
      {
        onSuccess: (response) => {
          setResult(response);
          setLetter(response.letter);
          setPickerOpen(false);
        },
        onError: (failure) => {
          setError(errorMessageOf(failure));
          setPickerOpen(false);
        },
      },
    );
  }

  return {
    fields,
    set,
    scan,
    missing,
    tooLong,
    descriptionLength,
    experienceTooLong,
    experienceLength,
    canWrite,
    pickerOpen,
    openPicker,
    closePicker: () => setPickerOpen(false),
    writeWith,
    writing: write.isPending,
    error,
    result,
    /** The draft as the user edits it. */
    letter,
    setLetter,
  };
}
