"use client";

import { useMemo, useState } from "react";

import type { AiProvider } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import { scanJobPosting } from "@/shared/ai-tools";
import type { SavedCv } from "@/shared/contracts/applicant";
import {
  COVER_LETTER_LIMITS as L,
  type CoverLetterResponse,
  type CoverLetterTone,
} from "@/shared/contracts/cover-letter";

import { useWriteCoverLetter } from "../api/cover-letter.mutations";
import { useSaveApplicantName } from "../../api/applicant.mutations";
import { useSavedCvs } from "../../shared/hooks/use-saved-cvs";

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
 *  - **Asked once**: the name starts from the one saved for applications and
 *    is saved when changed; "What you've done" starts from the latest saved CV
 *    (another can be picked, or none). Using a saved CV moves it to the top.
 */
export function useCoverLetter(defaults: { name: string }, savedInitial: SavedCv[]) {
  const saved = useSavedCvs(savedInitial);
  const [savedName, setSavedName] = useState(defaults.name.trim());
  const [cvId, setCvId] = useState<string | null>(savedInitial[0]?.id ?? null);
  const saveName = useSaveApplicantName();
  const [fields, setFields] = useState<CoverLetterFields>({
    name: defaults.name,
    experience: savedInitial[0]?.text ?? "",
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

  /** Fills "What you've done" with a saved CV, or empties it (`null`: write your own). */
  function pickSavedCv(id: string | null) {
    setCvId(id);
    set("experience", saved.cvs.find((cv) => cv.id === id)?.text ?? "");
  }

  /** After a letter: keep a changed name for next time, and move the saved CV it used to the top. In the background. */
  function rememberInputs() {
    const name = fields.name.trim();
    if (name && name !== savedName) {
      saveName.mutate(name, {
        onSuccess: () => setSavedName(name),
        onError: (failure) => console.warn(`[cover-letter] couldn't save the name: ${errorMessageOf(failure)}`),
      });
    }
    const cv = saved.cvs.find((c) => c.id === cvId);
    if (cv && cv.text.trim() === fields.experience.trim()) {
      saved.remember({ label: cv.label, cv: { text: cv.text, source: cv.source, ...(cv.pages && { pages: cv.pages }) } });
    }
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
          rememberInputs();
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
    savedCvs: saved.cvs,
    /** The saved CV "What you've done" was filled from, if any. */
    cvId,
    pickSavedCv,
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
