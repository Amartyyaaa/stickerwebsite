import 'server-only';
import { readFile, rm } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { databaseFile } from '@/lib/db/url';
import { eachLimit, mb, typeFor, uploadsRoot, walk } from './files';
import { snapshotKey, snapshotsToDelete } from './retention';
import { Bucket, bucketConfig, NOT_SET_UP } from './s3';

export interface BackupResult {
  snapshot: string | null;
  copied: number;
  stored: number;
  deleted: number;
  bytes: number;
}

/**
 * Copy the database and every new photo to the backup bucket, then remove old
 * database snapshots. Safe to run while the store is open.
 */
export async function runBackup(log: (line: string) => void = console.log): Promise<BackupResult> {
  const config = bucketConfig();
  if (!config) throw new Error(NOT_SET_UP);
  const bucket = new Bucket(config);
  const started = Date.now();

  // 1. The database: VACUUM INTO writes a consistent copy even while orders are coming in.
  let snapshot: string | null = null;
  const file = databaseFile();
  if (file) {
    const tmp = `${file}.backup-${started}.sqlite`;
    try {
      await db.run(sql.raw(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`));
      const data = gzipSync(await readFile(tmp), { level: 6 });
      snapshot = snapshotKey(started);
      await bucket.put(snapshot, data, 'application/gzip');
      log(`Database: saved ${snapshot} (${mb(data.length)})`);
    } finally {
      await rm(tmp, { force: true });
    }
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

  return { snapshot, copied: missing.length, stored: local.length, deleted: old.length, bytes };
}
