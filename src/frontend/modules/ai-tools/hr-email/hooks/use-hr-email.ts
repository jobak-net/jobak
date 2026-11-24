"use client";

import { useMemo, useState } from "react";

import type { AiProvider } from "@/frontend/modules/onboarding";
import { errorMessageOf } from "@/frontend/shared/api";
import { findAiTells, scanJobPosting } from "@/shared/ai-tools";
import type { SavedCv } from "@/shared/contracts/applicant";
import {
  HR_EMAIL_LIMITS as L,
  type HrEmailPurpose,
  type HrEmailRequest,
  type HrEmailResponse,
  type HrEmailTone,
} from "@/shared/contracts/hr-email";

import { useWriteHrEmail } from "../api/hr-email.mutations";
import { PURPOSES } from "../lib/purposes";
import { useSaveApplicantName } from "../../api/applicant.mutations";

export interface HrEmailFields {
  name: string;
  recipientName: string;
  recipientEmail: string;
  company: string;
  title: string;
  posting: string;
  theirMessage: string;
  draft: string;
  notes: string;
}

/** A plausible address, or empty: the API refuses anything else. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The HR email tool's state.
 *
 *  - **The purpose** decides which fields show (`PURPOSES`); hidden ones are
 *    sent empty.
 *  - **The name** starts from the one saved for applications and is saved
 *    when changed, as in the cover letter. **A saved CV** can be the source
 *    of experience (applying, outreach, referrals); without one, the server
 *    uses the profile's roles and skills.
 *  - **Pasted text someone else wrote** (a posting, HR's message) is checked
 *    as it's pasted for text planted for AI tools.
 *  - **Write** opens the provider popup; the result's subject and email are
 *    editable, to copy or open in the user's email app.
 */
export function useHrEmail(defaults: { name: string }, savedCvs: SavedCv[]) {
  const [purpose, setPurposeState] = useState<HrEmailPurpose>("apply");
  const [tone, setTone] = useState<HrEmailTone>("friendly");
  const [fields, setFields] = useState<HrEmailFields>({
    name: defaults.name,
    recipientName: "",
    recipientEmail: "",
    company: "",
    title: "",
    posting: "",
    theirMessage: "",
    draft: "",
    notes: "",
  });
  const [cvId, setCvId] = useState<string | null>(savedCvs[0]?.id ?? null);
  const [savedName, setSavedName] = useState(defaults.name.trim());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [result, setResult] = useState<HrEmailResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const write = useWriteHrEmail();
  const saveName = useSaveApplicantName();

  const config = PURPOSES[purpose];
  const scan = useMemo(() => {
    const posting = config.fields.posting ? scanJobPosting(fields.posting) : null;
    const message = config.fields.theirMessage ? scanJobPosting(fields.theirMessage) : null;
    return { findings: [...(posting?.findings ?? []), ...(message?.findings ?? [])] };
  }, [config, fields.posting, fields.theirMessage]);
  // Live: rewording a flagged phrase removes it from the list.
  const styleFlags = useMemo(() => findAiTells(`${subject}\n${body}`), [subject, body]);

  const email = fields.recipientEmail.trim();
  const missing = [
    !fields.name.trim() && "your name",
    config.requires === "theirMessage" && fields.theirMessage.trim().length < 10 && "their message",
    config.requires === "draft" && fields.draft.trim().length < 20 && "your draft",
    config.requires === "notes" && !fields.notes.trim() && !fields.theirMessage.trim() && "what the offer is about",
    email && !EMAIL.test(email) && "a valid email address (or none)",
  ].filter((item): item is string => Boolean(item));
  const tooLong =
    fields.posting.length > L.posting ||
    fields.theirMessage.length > L.theirMessage ||
    fields.draft.length > L.draft ||
    fields.notes.length > L.notes;
  const canWrite = missing.length === 0 && !tooLong && !write.isPending;

  function set<K extends keyof HrEmailFields>(key: K, value: HrEmailFields[K]) {
    setFields((all) => ({ ...all, [key]: value }));
    setError(null);
  }

  function setPurpose(next: HrEmailPurpose) {
    setPurposeState(next);
    setError(null);
  }

  function request(provider: AiProvider): HrEmailRequest {
    const show = config.fields;
    const cv = show.cv ? savedCvs.find((c) => c.id === cvId) : undefined;
    return {
      provider,
      purpose,
      tone,
      sender: { name: fields.name.trim() },
      recipient: { name: fields.recipientName.trim(), email },
      job: {
        company: show.job ? fields.company.trim() : "",
        title: show.job ? fields.title.trim() : "",
        posting: show.posting ? fields.posting.trim() : "",
      },
      context: {
        theirMessage: show.theirMessage ? fields.theirMessage.trim() : "",
        draft: show.draft ? fields.draft.trim() : "",
        notes: fields.notes.trim(),
      },
      ...(cv && { cv: { text: cv.text, source: cv.source, ...(cv.pages && { pages: cv.pages }) } }),
    };
  }

  function writeWith(provider: AiProvider) {
    setError(null);
    write.mutate(request(provider), {
      onSuccess: (response) => {
        setResult(response);
        setSubject(response.subject);
        setBody(response.body);
        setPickerOpen(false);
        // Keep a changed name for next time, in the background.
        const name = fields.name.trim();
        if (name && name !== savedName) {
          saveName.mutate(name, {
            onSuccess: () => setSavedName(name),
            onError: (failure) => console.warn(`[hr-email] couldn't save the name: ${errorMessageOf(failure)}`),
          });
        }
      },
      onError: (failure) => {
        setError(errorMessageOf(failure));
        setPickerOpen(false);
      },
    });
  }

  return {
    purpose,
    setPurpose,
    config,
    tone,
    setTone,
    fields,
    set,
    savedCvs,
    cvId,
    setCvId,
    scan,
    missing,
    tooLong,
    canWrite,
    pickerOpen,
    openPicker: () => canWrite && setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    writeWith,
    writing: write.isPending,
    error,
    result,
    subject,
    setSubject,
    body,
    setBody,
    styleFlags,
    /** The address to open the email app with, when the user gave a valid one. */
    recipientEmail: EMAIL.test(email) ? email : "",
  };
}
