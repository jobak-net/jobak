import type { TalentCard } from "@/shared/contracts/talent";

/**
 * The public talent directory. A port, so the use case never names the view.
 *
 * Read-only on purpose: publishing and editing a profile are the owner's, and
 * belong somewhere that checks who is asking — not next to the public read.
 */
export interface PublicTalentRepository {
    /** Published cards, newest first. */
    list(limit: number): Promise<TalentCard[]>;
}
