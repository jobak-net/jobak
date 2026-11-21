import "server-only";

import { ListPublicTalentUseCase } from "./application/list-public-talent.use-case";
import { PgPublicTalentRepository } from "./infrastructure/pg-public-talent.repository";

/**
 * The talent module's composition root. Cached per process, versioned so a
 * running dev server rebuilds it when its shape changes.
 */
export interface TalentModule {
    /** The public talent directory — `GET /api/v1/talent`. */
    listPublic: ListPublicTalentUseCase;
}

const VERSION = 1;

const globalForTalent = globalThis as unknown as {
    talentModule?: TalentModule;
    talentModuleVersion?: number;
};

export function getTalentModule(): TalentModule {
    if (!globalForTalent.talentModule || globalForTalent.talentModuleVersion !== VERSION) {
        globalForTalent.talentModule = { listPublic: new ListPublicTalentUseCase(new PgPublicTalentRepository()) };
        globalForTalent.talentModuleVersion = VERSION;
    }
    return globalForTalent.talentModule;
}
