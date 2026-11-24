import "server-only";

import {
  DeleteCvUseCase,
  GetApplicantUseCase,
  SaveCvUseCase,
  UpdateApplicantNameUseCase,
} from "./application/applicant.use-cases";
import { PgApplicantRepository } from "./infrastructure/pg-applicant.repository";

/**
 * The applicant module's composition root: the name and CVs a user applies
 * with, asked once and kept for every AI tool. Cached per process like the
 * other modules; bump `VERSION` when its shape changes.
 */
export interface ApplicantModule {
  /** `GET /api/v1/applicant`. */
  get: GetApplicantUseCase;
  /** `PUT /api/v1/applicant/name`. */
  setName: UpdateApplicantNameUseCase;
  /** `POST /api/v1/applicant/cvs`. */
  saveCv: SaveCvUseCase;
  /** `DELETE /api/v1/applicant/cvs/[id]`. */
  deleteCv: DeleteCvUseCase;
}

const VERSION = 1;

const globalForApplicant = globalThis as unknown as {
  applicantModule?: { module: ApplicantModule; version: number };
};

export function getApplicantModule(): ApplicantModule {
  if (globalForApplicant.applicantModule?.version !== VERSION) {
    const repository = new PgApplicantRepository();
    globalForApplicant.applicantModule = {
      version: VERSION,
      module: {
        get: new GetApplicantUseCase(repository),
        setName: new UpdateApplicantNameUseCase(repository),
        saveCv: new SaveCvUseCase(repository),
        deleteCv: new DeleteCvUseCase(repository),
      },
    };
  }
  return globalForApplicant.applicantModule.module;
}
