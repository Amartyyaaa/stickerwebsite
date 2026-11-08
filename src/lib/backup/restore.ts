import 'server-only';
import { mkdir, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { databaseFile } from '@/lib/db/url';
import { eachLimit, inside, mb, uploadsRoot } from './files';
import { SNAPSHOT_RE } from './retention';
import { Bucket, bucketConfig, NOT_SET_UP } from './s3';

/**
 * Bring back the database and photos from the backup bucket. The store must be
 * stopped while the database is replaced. Never opens the database itself.
 */
export async function runRestore(opts: { from?: string; force?: boolean; photosOnly?: boolean }, log: (line: string) => void = console.log): Promise<void> {
  const config = bucketConfig();
  if (!config) throw new Error(NOT_SET_UP);
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
    if (exists && !opts.force) {
      throw new Error(`A database already exists at ${file}. Stop the store, then run this again with --force to replace it (the current one is kept as a copy).`);
    }
    const body = await bucket.get(pick);
    if (!body) throw new Error(`Couldn’t download ${pick}.`);
    const data = gunzipSync(body);
    await mkdir(dirname(file), { recursive: true });
    if (exists) {
      const keep = `${file}.before-restore-${Date.now()}`;
      for (const suffix of ['', '-wal', '-shm']) await rename(file + suffix, keep + suffix).catch(() => {});
      log(`Kept the old database as ${basename(keep)}`);
    }
    await writeFile(`${file}.restoring`, data);
    await rename(`${file}.restoring`, file);
    log(`Database: restored from ${pick} (${mb(data.length)})`);
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
