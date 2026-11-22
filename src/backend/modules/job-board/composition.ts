import "server-only";

import { GetJobBoardJobUseCase } from "./application/get-job-board-job.use-case";
import { ListJobBoardUseCase } from "./application/list-job-board.use-case";
import { PgJobBoardRepository } from "./infrastructure/pg-job-board.repository";

/**
 * The job board module's composition root: the public pool, as anyone may
 * see it. Cached per process, versioned so a running dev server rebuilds it
 * when its shape changes.
 */
export interface JobBoardModule {
    /** The board's listings — `GET /api/v1/job-board`. */
    list: ListJobBoardUseCase;
    /** One public job — `GET /api/v1/job-board/[slug]`. */
    get: GetJobBoardJobUseCase;
}

const VERSION = 1;

const globalForJobBoard = globalThis as unknown as {
    jobBoardModule?: JobBoardModule;
    jobBoardModuleVersion?: number;
};

export function getJobBoardModule(): JobBoardModule {
    if (!globalForJobBoard.jobBoardModule || globalForJobBoard.jobBoardModuleVersion !== VERSION) {
        const board = new PgJobBoardRepository();
        globalForJobBoard.jobBoardModule = { list: new ListJobBoardUseCase(board), get: new GetJobBoardJobUseCase(board) };
        globalForJobBoard.jobBoardModuleVersion = VERSION;
    }
    return globalForJobBoard.jobBoardModule;
}
