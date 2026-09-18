import { Email } from "@/backend/modules/auth/domain/value-objects/email.vo";

import type {
  WorkPreference,
  WaitlistSignup,
} from "../../domain/entities/waitlist-entry.entity";
import type { WaitlistRepository } from "../../domain/ports/waitlist.repository";

export interface JoinWaitlistInput {
  email: unknown;
  field?: unknown;
  jobTitles?: unknown;
  countries?: unknown;
  workPreference?: unknown;
  source?: unknown;
  referrer?: unknown;
}

const WORK_PREFERENCES: readonly WorkPreference[] = [
  "remote",
  "on-site",
  "hybrid",
];

/*
 * Bounds on what a submission may contain. These are not UX rules — the form
 * cannot produce anything near them — they are what stops a hand-crafted POST
 * writing a megabyte of junk into each column.
 */
const MAX_ITEMS = 20;
const MAX_ITEM_LENGTH = 100;
const MAX_SOURCE_LENGTH = 100;
const MAX_REFERRER_LENGTH = 500;

/** Keeps only sane strings, de-duplicated and capped. */
function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, MAX_ITEM_LENGTH);
    if (trimmed) seen.add(trimmed);
    if (seen.size >= MAX_ITEMS) break;
  }
  return [...seen];
}

const cleanText = (raw: unknown, max: number): string | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Add someone to the waitlist.
 *
 * ── Always reports success ──────────────────────────────────
 * A repeat signup, an address already on the list — the answer is the same
 * "you're on the list". Anything else would let the form be used to test which
 * addresses are registered, and would also confuse someone who simply clicked
 * twice.
 *
 * The only failure surfaced is a malformed email, because that one the visitor
 * can and must fix.
 */
export class JoinWaitlistUseCase {
  constructor(private readonly waitlist: WaitlistRepository) {}

  async execute(input: JoinWaitlistInput): Promise<void> {
    // Throws on a malformed address — reused from auth so the rule is stated
    // once, and so a waitlist address is valid the day it becomes an account.
    const email = Email.create(input.email);

    const workPreference = cleanList(input.workPreference).filter(
      (value): value is WorkPreference =>
        (WORK_PREFERENCES as readonly string[]).includes(value),
    );

    const signup: WaitlistSignup = {
      email: email.value,
      field: cleanText(input.field, MAX_ITEM_LENGTH),
      jobTitles: cleanList(input.jobTitles),
      /*
       * Upper-cased because these are ISO-3166-1 alpha-2 codes and the picker
       * sends them that way; normalising here means a hand-written "eg" still
       * groups with "EG" when the list is analysed.
       */
      countries: cleanList(input.countries).map((c) => c.toUpperCase()),
      workPreference,
      source: cleanText(input.source, MAX_SOURCE_LENGTH),
      referrer: cleanText(input.referrer, MAX_REFERRER_LENGTH),
    };

    await this.waitlist.add(signup);
  }
}
