import 'server-only';
import { readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

/** Helpers shared by backup and restore. */

export { uploadsRoot } from '@/lib/storage';

/** Every file under a folder, with its path relative to the folder (forward slashes). Half-written uploads are skipped. */
export async function walk(root: string): Promise<Array<{ rel: string; path: string; size: number }>> {
  const out: Array<{ rel: string; path: string; size: number }> = [];
  async function visit(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    for (const e of entries) {
      const path = join(dir, e.name);
      if (e.isDirectory()) await visit(path);
      else if (e.isFile() && !e.name.endsWith('.part')) out.push({ rel: relative(root, path).split(sep).join('/'), path, size: (await stat(path)).size });
    }
  }
  await visit(root);
  return out;
}

/** A path inside `root` for a key from the bucket, refusing anything that would land outside it. */
export function inside(root: string, rel: string): string {
  const p = resolve(root, rel);
  if (!p.startsWith(root + sep)) throw new Error(`Unsafe path in backup: ${rel}`);
  return p;
}

/** Run `fn` on every item, `n` at a time. */
export async function eachLimit<T>(items: T[], n: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

export const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
export const typeFor = (key: string) => (key.endsWith('.webp') ? 'image/webp' : 'application/octet-stream');
