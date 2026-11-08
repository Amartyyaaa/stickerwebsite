/**
 * Which database snapshots to keep: the newest one of each of the last 30 days
 * that have one, and the newest one of each of the last 12 months. Pure, so
 * it's unit-tested. Keys look like db/2026-11-08-0400.sqlite.gz (Indian time).
 */

export const SNAPSHOT_RE = /^db\/(\d{4}-\d{2}-\d{2})-(\d{4})\.sqlite\.gz$/;

/** The key for a snapshot taken at `ms` (Unix milliseconds), named in Indian time. */
export function snapshotKey(ms: number): string {
  const ist = new Date(ms + 19_800_000).toISOString();
  return `db/${ist.slice(0, 10)}-${ist.slice(11, 13)}${ist.slice(14, 16)}.sqlite.gz`;
}

export function snapshotsToDelete(keys: string[], keep: { daily: number; monthly: number } = { daily: 30, monthly: 12 }): string[] {
  // Newest first; the names sort by date and time.
  const snaps = keys.filter((k) => SNAPSHOT_RE.test(k)).sort().reverse();
  const kept = new Set<string>();
  const days = new Set<string>();
  const months = new Set<string>();
  for (const key of snaps) {
    const day = SNAPSHOT_RE.exec(key)![1];
    if (!days.has(day) && days.size < keep.daily) {
      days.add(day);
      kept.add(key);
    }
    const month = day.slice(0, 7);
    if (!months.has(month) && months.size < keep.monthly) {
      months.add(month);
      kept.add(key);
    }
  }
  return snaps.filter((k) => !kept.has(k));
}
