import type {
  WaitlistEntry,
  WaitlistSignup,
} from "../entities/waitlist-entry.entity";

export interface WaitlistRepository {
  /**
   * Adds an entry, or quietly keeps the existing one.
   *
   * Signing up twice is not an error — people forget, or click the button
   * again when nothing visibly happened. Reporting "already on the list" would
   * also turn the form into a way to test whether an address is registered,
   * which is the same leak the auth module works to avoid.
   *
   * Returns whether a new row was created, for counting rather than for
   * anything the visitor sees.
   */
  add(signup: WaitlistSignup): Promise<{ created: boolean }>;

  /** How many are waiting. For the "N people ahead of you" line, if wanted. */
  count(): Promise<number>;

  /** The next entries to invite, oldest first. For the launch, not the site. */
  pending(limit: number): Promise<WaitlistEntry[]>;
}
