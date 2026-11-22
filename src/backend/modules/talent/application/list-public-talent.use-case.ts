import type { TalentCard } from "@/shared/contracts/talent";

import type { PublicTalentRepository } from "../domain/public-talent.repository";

/** How many cards the directory shows. */
const DIRECTORY_SIZE = 120;

/** The public talent directory — `GET /api/v1/talent`. */
export class ListPublicTalentUseCase {
    constructor(private readonly talent: PublicTalentRepository) {}

    execute(): Promise<TalentCard[]> {
        return this.talent.list(DIRECTORY_SIZE);
    }
}
