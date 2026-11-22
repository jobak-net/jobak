/**
 * The public job board (`/jobs`, `/jobs/[slug]`). Server-only loaders are in
 * `./server`.
 */
export { JobBoardView } from "./views/job-board-view";
export { JobDetailView } from "./views/job-detail-view";
export { jobBoardMetadata } from "./lib/job-board-metadata";
export { jobPageMetadata } from "./lib/job-page-metadata";
export { PAGE_SIZE, readBoardView, type BoardSearchParams } from "./lib/board-url";
