import { describe, expect, it } from 'vitest';
import { snapshotKey, snapshotsToDelete } from './retention';

const key = (d: string, t = '0400') => `db/${d}-${t}.sqlite.gz`;

describe('backup retention', () => {
  it('names snapshots in Indian time', () => {
    // 22:30 UTC on 7 Nov is 04:00 on 8 Nov in India.
    expect(snapshotKey(Date.UTC(2026, 10, 7, 22, 30))).toBe('db/2026-11-08-0400.sqlite.gz');
  });
  it('keeps the newest snapshot of each day for 30 days', () => {
    const keys = [key('2026-11-08', '0400'), key('2026-11-08', '1530'), key('2026-11-07')];
    expect(snapshotsToDelete(keys)).toEqual([key('2026-11-08', '0400')]);
  });
  it('then keeps one a month for 12 months, and drops the rest', () => {
    const keys: string[] = [];
    // Daily snapshots from 1 Jan 2025 to 8 Nov 2026.
    for (let d = Date.UTC(2025, 0, 1); d <= Date.UTC(2026, 10, 8); d += 86_400_000) keys.push(key(new Date(d).toISOString().slice(0, 10)));
    const gone = new Set(snapshotsToDelete(keys));
    const left = keys.filter((k) => !gone.has(k));
    // The last 30 days (back to 10 Oct), plus the newest of each month for 12 months. November's and October's
    // newest are already among the 30, so that adds the last day of the 10 months from December 2025 to September 2026.
    expect(left.length).toBe(30 + 10);
    expect(left).toContain(key('2026-10-31'));
    expect(left).toContain(key('2025-12-31'));
    expect(left).not.toContain(key('2025-11-30'));
    expect(left).not.toContain(key('2026-10-01'));
  });
  it('never touches other files', () => {
    expect(snapshotsToDelete(['db/notes.txt', 'uploads/originals/x'])).toEqual([]);
  });
});
