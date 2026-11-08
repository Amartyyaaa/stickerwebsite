import 'server-only';
import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SNAPSHOT_RE } from './retention';

/**
 * Backups kept on this server, used while Cloudflare R2 isn't set up: a database copy each
 * night in data/backups/db/ (on the live site, /srv/printyourvibe/shared/data/backups), kept
 * for 14 days. They undo mistakes, but they don't survive losing the server: add R2 for that,
 * and download a copy from the admin dashboard now and then.
 * (No database import here: restore must not open the database it's replacing.)
 */
export const localBackupDir = () => resolve(/*turbopackIgnore: true*/ process.env.LOCAL_BACKUP_DIR || 'data/backups');

/** How many local copies to keep: the newest of each of the last 14 days. */
export const LOCAL_KEEP = { daily: 14, monthly: 0 };

/** The local database copies, as keys like db/2026-11-08-0400.sqlite.gz, oldest first. */
export async function localSnapshots(): Promise<string[]> {
  const names = await readdir(join(/*turbopackIgnore: true*/ localBackupDir(), 'db')).catch(() => [] as string[]);
  return names
    .map((n) => `db/${n}`)
    .filter((k) => SNAPSHOT_RE.test(k))
    .sort();
}
