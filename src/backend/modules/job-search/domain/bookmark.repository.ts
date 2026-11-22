/**
 * Where a user's bookmarks are kept. A port, so the use case never names the
 * table and can be exercised without Postgres.
 */
export interface BookmarkRepository {
    /**
     * Stores whether `userId` has bookmarked `jobId` and returns what is stored.
     * Throws `NotFoundError` when there is no such job.
     */
    set(userId: string, jobId: string, bookmarked: boolean): Promise<boolean>;
}
