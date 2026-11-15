// `Job` and the types it uses are the API contract: `@/shared/contracts/jobs`.

export interface CvInsights {
  topSkills: string[];
  avgScore: number;
  topMatchesCount: number;
  totalJobs: number;
  bookmarkedCount: number;
}
