import { NotFoundError } from "@/backend/shared/exceptions";
import {
  APPLICANT_LIMITS,
  type ApplicantResponse,
  type SaveCvRequest,
  type SavedCv,
} from "@/shared/contracts/applicant";

import type { ApplicantRepository } from "../domain/applicant.repository";
import { cvHash, normalizeCvText, type SavedCvRecord } from "../domain/saved-cv";

const toSavedCv = (cv: SavedCvRecord): SavedCv => ({
  id: cv.id,
  label: cv.label,
  source: cv.source,
  pages: cv.pages,
  text: cv.text,
  createdAt: cv.createdAt.toISOString(),
  lastUsedAt: cv.lastUsedAt.toISOString(),
});

/** `GET /api/v1/applicant`: the name and the CVs, most recently used first. */
export class GetApplicantUseCase {
  constructor(private readonly repository: ApplicantRepository) {}

  async execute(userId: string): Promise<ApplicantResponse> {
    const [name, cvs] = await Promise.all([this.repository.name(userId), this.repository.listCvs(userId)]);
    return { name, cvs: cvs.map(toSavedCv) };
  }
}

/** `PUT /api/v1/applicant/name`. A 404 before onboarding, when there's no preferences row to hold it. */
export class UpdateApplicantNameUseCase {
  constructor(private readonly repository: ApplicantRepository) {}

  async execute(userId: string, name: string): Promise<{ name: string }> {
    const trimmed = name.trim();
    if (!(await this.repository.setName(userId, trimmed))) throw new NotFoundError("Finish onboarding first");
    return { name: trimmed };
  }
}

/**
 * `POST /api/v1/applicant/cvs`: keeps a CV the user just used. The same text
 * again (by hash) only moves it to the top; past `APPLICANT_LIMITS.savedCvs`,
 * the least recently used goes.
 */
export class SaveCvUseCase {
  constructor(private readonly repository: ApplicantRepository) {}

  async execute(userId: string, request: SaveCvRequest): Promise<SavedCv> {
    const text = normalizeCvText(request.cv.text);
    const saved = await this.repository.saveCv(
      userId,
      {
        label: request.label.trim(),
        text,
        source: request.cv.source,
        pages: request.cv.source === "pdf" ? (request.cv.pages ?? null) : null,
        hash: cvHash(text),
      },
      APPLICANT_LIMITS.savedCvs,
    );
    return toSavedCv(saved);
  }
}

/** `DELETE /api/v1/applicant/cvs/[id]`: a 404 for an id that isn't one of the user's CVs. */
export class DeleteCvUseCase {
  constructor(private readonly repository: ApplicantRepository) {}

  async execute(userId: string, id: string): Promise<{ deleted: true }> {
    if (!(await this.repository.deleteCv(userId, id))) throw new NotFoundError("No such CV");
    return { deleted: true };
  }
}
