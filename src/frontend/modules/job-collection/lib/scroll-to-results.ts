/** True right after a search ends with jobs to show: the moment to bring the results into view. */
export function shouldScrollToResults({
    wasCollecting,
    collecting,
    jobCount,
}: {
    wasCollecting: boolean;
    collecting: boolean;
    jobCount: number;
}): boolean {
    return wasCollecting && !collecting && jobCount > 0;
}
