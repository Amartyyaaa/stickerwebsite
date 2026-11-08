import 'server-only';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { databaseFile } from '@/lib/db/url';
import { eachLimit, inside, mb, uploadsRoot } from './files';
import { localBackupDir, localSnapshots } from './local';
import { SNAPSHOT_RE } from './retention';
import { Bucket, bucketConfig, NOT_SET_UP } from './s3';

/** Replace the database file with `data`, keeping the current one as a copy. Needs `force` if one exists. */
async function replaceDatabase(file: string, data: Buffer, opts: { force?: boolean; from: string }, log: (line: string) => void) {
  if (data.subarray(0, 16).toString('latin1') !== 'SQLite format 3\u0000') throw new Error(`${opts.from} isn’t a database backup.`);
  const exists = await stat(file).then(
    () => true,
    () => false,
  );
  if (exists && !opts.force) {
    throw new Error(`A database already exists at ${file}. Stop the store, then run this again with --force to replace it (the current one is kept as a copy).`);
  }
  await mkdir(dirname(file), { recursive: true });
  if (exists) {
    const keep = `${file}.before-restore-${Date.now()}`;
    for (const suffix of ['', '-wal', '-shm']) await rename(file + suffix, keep + suffix).catch(() => {});
    log(`Kept the old database as ${basename(keep)}`);
  }
  await writeFile(`${file}.restoring`, data);
  await rename(`${file}.restoring`, file);
  log(`Database: restored from ${opts.from} (${mb(data.length)})`);
}

/** Gzipped backups (.sqlite.gz) are unpacked; a plain .sqlite file is used as it is. */
const unpack = (data: Buffer) => (data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data) : data);

export interface RestoreOptions {
  /** The last backup from this day (YYYY-MM-DD) or earlier. */
  from?: string;
  /** Replace an existing database (it's kept as a copy). */
  force?: boolean;
  /** Only download photos missing on this server (from R2). */
  photosOnly?: boolean;
  /** Restore this backup file, such as one downloaded from the admin dashboard. */
  file?: string;
  /** Restore the newest copy kept on this server (backups made while R2 isn't set up). */
  local?: boolean;
}

/**
 * Bring back the database and photos from the backup bucket, or the database from a
 * copy on this server (--local) or a file (--file). The store must be stopped while the
 * database is replaced. Never opens the database itself.
 */
export async function runRestore(opts: RestoreOptions, log: (line: string) => void = console.log): Promise<void> {
  if (opts.file || opts.local) {
    const file = databaseFile();
    if (!file) throw new Error('This store uses a hosted database: restore it from its own dashboard.');
    let path = opts.file;
    if (!path) {
      const snaps = await localSnapshots();
      const pick = opts.from ? snaps.filter((k) => SNAPSHOT_RE.exec(k)![1] <= opts.from!).at(-1) : snaps.at(-1);
      if (!pick) throw new Error(opts.from ? `There’s no copy on this server from ${opts.from} or earlier.` : `There are no backup copies in ${localBackupDir()} yet.`);
      path = join(localBackupDir(), pick);
    }
    const data = await readFile(path).catch(() => {
      throw new Error(`Couldn’t read ${path}.`);
    });
    await replaceDatabase(file, unpack(data), { force: opts.force, from: path }, log);
    log('Photos: not touched (they stay on this server; R2 backups bring back missing ones)');
    return;
  }

  const config = bucketConfig();
  if (!config) throw new Error(`${NOT_SET_UP} To bring back a copy kept on this server, use --local (or --file with a downloaded backup).`);
  const bucket = new Bucket(config);

  if (!opts.photosOnly) {
    const file = databaseFile();
    if (!file) throw new Error('This store uses a hosted database: restore it from its own dashboard. Use --photos-only to bring back photos.');
    const snaps = (await bucket.list('db/')).map((o) => o.key).filter((k) => SNAPSHOT_RE.test(k)).sort();
    const pick = opts.from ? snaps.filter((k) => SNAPSHOT_RE.exec(k)![1] <= opts.from!).at(-1) : snaps.at(-1);
    if (!pick) throw new Error(opts.from ? `There’s no database backup from ${opts.from} or earlier.` : 'There are no database backups in the bucket yet.');
    const exists = await stat(file).then(
      () => true,
      () => false,
    );
    // Check before downloading, so a missing --force doesn't cost a download.
    if (exists && !opts.force) {
      throw new Error(`A database already exists at ${file}. Stop the store, then run this again with --force to replace it (the current one is kept as a copy).`);
    }
    const body = await bucket.get(pick);
    if (!body) throw new Error(`Couldn’t download ${pick}.`);
    await replaceDatabase(file, unpack(body), { force: opts.force, from: pick }, log);
  }

  // Photos: download any the server doesn't have.
  const root = uploadsRoot();
  const remote = await bucket.list('uploads/');
  let fetched = 0;
  await eachLimit(remote, 4, async (o) => {
    const target = inside(root, o.key.slice('uploads/'.length));
    const size = await stat(target).then(
      (s) => s.size,
      () => -1,
    );
    if (size === o.size) return;
    const body = await bucket.get(o.key);
    if (!body) return;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    fetched++;
  });
  log(`Photos: downloaded ${fetched} file(s); ${remote.length} in the backup`);
}
