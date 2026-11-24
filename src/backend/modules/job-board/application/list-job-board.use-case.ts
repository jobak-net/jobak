import {
  JOB_BOARD_SEARCH_MAX,
  type JobBoardPage,
  type JobBoardQuery,
} from "@/shared/contracts/job-board";
import { categoryKeywords } from "@/shared/job-categories";

import type { JobBoardRepository } from "../domain/job-board.repository";

/**
 * The board's listings — `GET /api/v1/job-board`.
 *
 * `region: "mena"` is the default because of who this is for, and a page past
 * the end answers no jobs with the real total: collection runs continuously,
 * so a bookmarked `?page=9` goes stale on its own, and the page should say
 * "past the end" rather than "nothing matches".
 */
export class ListJobBoardUseCase {
  constructor(private readonly board: JobBoardRepository) {}

  execute(query: Required<JobBoardQuery>): Promise<JobBoardPage> {
    return this.board.list(
      {
        region: query.region,
        workplace: query.workplace,
        search: query.q.slice(0, JOB_BOARD_SEARCH_MAX).trim(),
        categoryKeywords: categoryKeywords(query.category) ?? [],
      },
      { limit: query.limit, offset: (query.page - 1) * query.limit },
    );
  }
}
