import type { ExternalIdentity } from "../entities/identity.entity";
import type { User } from "../entities/user.entity";

/**
 * Persistence for the local user row.
 *
 * Lives in `domain` rather than beside its Postgres implementation so the
 * dependency arrow points inward: use cases import this interface,
 * infrastructure implements it, and nothing in `application` ever names `pg`.
 */
export interface UserRepository {
  findByExternalId(externalId: string): Promise<User | null>;

  /**
   * Creates the row on first sight, or refreshes email and name if it exists.
   *
   * One statement keyed on `external_id` rather than find-then-insert: two
   * requests from a brand-new user can arrive together (a page and its
   * prefetches), and a check-then-insert would let both see "missing" and one
   * would fail on the unique index.
   */
  upsert(identity: ExternalIdentity): Promise<User>;

  /**
   * Removes the row. Every user-owned table cascades from `users`, so this is
   * the whole account's data — feedback alone survives, detached.
   */
  deleteByExternalId(externalId: string): Promise<void>;
}
