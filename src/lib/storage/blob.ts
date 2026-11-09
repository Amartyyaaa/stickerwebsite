import 'server-only';
import { del, get, put } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { MAX_UPLOAD_BYTES } from '@/lib/custom/types';
import type { Storage, UploadTarget } from './index';

const KEY_RE = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*(\.[a-z0-9]+)?$/;
const HOUR = 60 * 60 * 1000;

function checkKey(key: string): string {
  if (!KEY_RE.test(key)) throw new Error(`Invalid storage key: ${key}`);
  return key;
}

/**
 * Vercel Blob, for hosting on Vercel (whose disk is wiped between requests). Used when
 * BLOB_READ_WRITE_TOKEN is set. Every file is private: shoppers only ever see photos
 * through /api/uploads/[id], which decides who may see what, exactly as with the disk.
 * Photos go straight from the browser to Blob with a token for that one file, because
 * Vercel limits what a request to the app itself can carry (about 4.5 MB).
 */
export class BlobStorage implements Storage {
  readonly viaApp = false;

  async uploadTarget({ key, contentType, bytes }: { id: string; key: string; contentType: string; bytes: number }): Promise<UploadTarget> {
    const pathname = checkKey(key);
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      maximumSizeInBytes: Math.min(bytes, MAX_UPLOAD_BYTES),
      allowedContentTypes: [contentType],
      validUntil: Date.now() + HOUR,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return { blob: { pathname, token, contentType } };
  }

  async putStream(): Promise<number> {
    throw new Error('Uploads go straight to Blob storage.');
  }

  async put(key: string, data: Buffer): Promise<void> {
    await put(checkKey(key), data, { access: 'private', addRandomSuffix: false, allowOverwrite: true });
  }

  async get(key: string): Promise<Buffer | null> {
    const found = await get(checkKey(key), { access: 'private' });
    if (!found || found.statusCode !== 200) return null;
    return Buffer.from(await new Response(found.stream).arrayBuffer());
  }

  async delete(keys: string[]): Promise<void> {
    if (keys.length) await del(keys.map(checkKey));
  }
}
