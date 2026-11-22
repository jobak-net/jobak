import type { BookmarkRepository } from "../domain/bookmark.repository";

/**
 * Bookmarks a job for a user, or removes the bookmark —
 * `PUT /api/v1/jobs/[jobId]/bookmark`.
 *
 * Sets the value it's given rather than flipping what's stored, so a repeated
 * request (double click, retry) can't undo itself.
 */
export class SetBookmarkUseCase {
    constructor(private readonly bookmarks: BookmarkRepository) {}

    async execute(userId: string, jobId: string, bookmarked: boolean): Promise<{ bookmarked: boolean }> {
        return { bookmarked: await this.bookmarks.set(userId, jobId, bookmarked) };
    }
}
