import 'server-only';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { databaseFile } from '@/lib/db/url';
import { eachLimit, mb, typeFor, uploadsRoot, walk } from './files';
import { LOCAL_KEEP, localBackupDir, localSnapshots } from './local';
import { snapshotKey, snapshotsToDelete } from './retention';
import { Bucket, bucketConfig } from './s3';

export interface BackupResult {
  snapshot: string | null;
  copied: number;
  stored: number;
  deleted: number;
  bytes: number;
  /** "local" while Cloudflare R2 isn't set up: the database copy stays on this server. */
  where: 'r2' | 'local';
}

/** A consistent, gzipped copy of the database, safe to take while orders come in. Null for a hosted database. */
export async function databaseSnapshot(): Promise<Buffer | null> {
  const file = databaseFile();
  if (!file) return null;
  // VACUUM INTO writes a consistent copy even while the store is busy.
  const tmp = `${file}.backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite`;
  try {
    await db.run(sql.raw(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`));
    return gzipSync(await readFile(tmp), { level: 6 });
  } finally {
    await rm(tmp, { force: true });
  }
}

/** Without R2: keep the database copy on this server (14 days). Photos are already on this disk. */
async function localBackup(started: number, log: (line: string) => void): Promise<BackupResult> {
  const data = await databaseSnapshot();
  if (!data) {
    log('Database: hosted elsewhere (it keeps its own backups), skipped');
    return { snapshot: null, copied: 0, stored: 0, deleted: 0, bytes: 0, where: 'local' };
  }
  const dir = localBackupDir();
  const key = snapshotKey(started);
  await mkdir(join(/*turbopackIgnore: true*/ dir, 'db'), { recursive: true });
  await writeFile(join(/*turbopackIgnore: true*/ dir, key), data);
  log(`Database: saved ${join(dir, key)} on this server (${mb(data.length)})`);
  log('Photos: not copied anywhere (Cloudflare R2 isn’t set up), so they stay only on this server');
  const old = snapshotsToDelete(await localSnapshots(), LOCAL_KEEP);
  for (const k of old) await rm(join(/*turbopackIgnore: true*/ dir, k), { force: true });
  if (old.length) log(`Removed ${old.length} old local copy(ies)`);
  return { snapshot: key, copied: 0, stored: 0, deleted: old.length, bytes: data.length, where: 'local' };
}

/**
 * Copy the database and every new photo to the backup bucket, then remove old
 * database snapshots. Without R2, keep a database copy on this server instead.
 * Safe to run while the store is open.
 */
export async function runBackup(log: (line: string) => void = console.log): Promise<BackupResult> {
  const started = Date.now();
  const config = bucketConfig();
  if (!config) return localBackup(started, log);
  const bucket = new Bucket(config);

  // 1. The database.
  let snapshot: string | null = null;
  const data = await databaseSnapshot();
  if (data) {
    snapshot = snapshotKey(started);
    await bucket.put(snapshot, data, 'application/gzip');
    log(`Database: saved ${snapshot} (${mb(data.length)})`);
  } else {
    log('Database: hosted elsewhere (it keeps its own backups), skipped');
  }

  // 2. Photos: copy files the bucket doesn't have yet. Uploads never change once written.
  const local = await walk(uploadsRoot());
  const remote = new Map((await bucket.list('uploads/')).map((o) => [o.key, o.size]));
  const missing = local.filter((f) => remote.get(`uploads/${f.rel}`) !== f.size);
  let bytes = 0;
  await eachLimit(missing, 4, async (f) => {
    const data = await readFile(f.path);
    await bucket.put(`uploads/${f.rel}`, data, typeFor(f.rel));
    bytes += data.length;
  });
  log(`Photos: copied ${missing.length} new file(s) (${mb(bytes)}); ${local.length} in all`);

  // 3. Keep 30 daily and 12 monthly database snapshots.
  const old = snapshotsToDelete((await bucket.list('db/')).map((o) => o.key));
  for (const key of old) await bucket.delete(key);
  if (old.length) log(`Removed ${old.length} old database snapshot(s)`);

  return { snapshot, copied: missing.length, stored: local.length, deleted: old.length, bytes, where: 'r2' };
}
