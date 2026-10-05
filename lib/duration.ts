/**
 * Formats the elapsed time between two ISO timestamps as a short, human-readable
 * string (e.g. "3 hours", "45 minutes", "2 days"). Used to show how long a slot's
 * current owner has held it, and how long a previous owner held it for.
 */
export function formatDuration(
  startIso: string,
  endIso: string = new Date().toISOString(),
): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const ms = Math.max(0, end - start);

  const seconds = Math.floor(ms / 1_000);
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"}`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}
