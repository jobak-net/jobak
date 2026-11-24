/** "7 Nov 2026" — a date, not a relative time, so it does not go stale on a cached page. */
export const formatJoined = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
