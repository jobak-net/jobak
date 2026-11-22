import { sanitizeDescription } from "@/backend/shared/html";
import { NotFoundError } from "@/backend/shared/exceptions";
import type { PublicJob } from "@/shared/contracts/job-board";

import type { JobBoardRepository } from "../domain/job-board.repository";

/**
 * One public job — `GET /api/v1/job-board/[slug]`. 404 when there's no
 * public job with that slug.
 *
 * The description is sanitised here, at the boundary, even though the scraper
 * already writes a safe subset: this is rendered to anonymous visitors, and
 * the n8n collectors also write `jobs.description`.
 */
export class GetJobBoardJobUseCase {
  constructor(private readonly board: JobBoardRepository) {}

  async execute(slug: string): Promise<PublicJob> {
    const job = await this.board.findBySlug(slug);
    if (!job) throw new NotFoundError("No public job with that slug");
    return { ...job, description: sanitizeDescription(job.description) };
  }
}
