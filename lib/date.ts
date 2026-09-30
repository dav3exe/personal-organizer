/** Today's date in the user's timezone, as YYYY-MM-DD. */
export function todayISODate(): string {
  return addDaysISODate(0);
}

/** Today plus `days` (negative for the past) in the user's timezone, as YYYY-MM-DD. */
export function addDaysISODate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
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
