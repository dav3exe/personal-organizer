/** Today's date in the user's timezone, as YYYY-MM-DD. */
export function todayISODate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** "2026-10-05" -> "5 Oct 2026" (parsed as a local date, so it never shifts a day). */
export function formatISODate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp -> "5 Oct 2026". */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
