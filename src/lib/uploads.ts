import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { Metadata } from 'sharp';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_PIXELS, MIN_UPLOAD_SIDE, UPLOAD_ID_RE, uploadSrc, type UploadInfo, type UploadType } from '@/lib/custom/types';
import { db } from '@/lib/db/client';
import { uploads } from '@/lib/db/schema';
import { getStorage, type UploadTarget } from '@/lib/storage';

/**
 * Custom-studio uploads: create an upload slot, check the file once it has
 * arrived, and serve its preview. Originals are kept untouched for printing.
 */

type UploadRow = typeof uploads.$inferSelect;

const PREVIEW_PX = 1600;
const THUMB_PX = 480;
const FORMATS = new Set(['png', 'jpeg', 'webp']);

export class UploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const isUploadId = (id: string) => UPLOAD_ID_RE.test(id);

/** Keep file names readable on order sheets, without paths or control characters. */
function cleanName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const clean = base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120);
  return clean || 'image';
}

export async function createUpload(input: { name: string; type: UploadType; size: number; kind?: 'custom' | 'product' | 'review' }): Promise<{ id: string; put: UploadTarget }> {
  const id = randomBytes(16).toString('base64url');
  const originalKey = `originals/${id}`;
  await db.insert(uploads).values({
    id,
    status: 'pending',
    kind: input.kind ?? 'custom',
    name: cleanName(input.name),
    contentType: input.type,
    bytes: input.size,
    originalKey,
    createdAt: Math.floor(Date.now() / 1000),
  });
  const put = await getStorage().uploadTarget({ id, key: originalKey, contentType: input.type, bytes: input.size });
  return { id, put };
}

export async function getUpload(id: string): Promise<UploadRow | null> {
  if (!isUploadId(id)) return null;
  return (await db.query.uploads.findFirst({ where: eq(uploads.id, id) })) ?? null;
}

export function toUploadInfo(row: UploadRow): UploadInfo {
  return {
    id: row.id,
    name: row.name,
    w: row.width ?? 0,
    h: row.height ?? 0,
    alpha: Boolean(row.hasAlpha),
    src: uploadSrc(row.id),
    thumb: uploadSrc(row.id, 'thumb'),
  };
}

/** Save the file body for a pending upload (local disk only; R2 uploads go straight to the bucket). */
export async function receiveUpload(id: string, body: ReadableStream<Uint8Array> | null): Promise<void> {
  const row = await getUpload(id);
  if (!row) throw new UploadError('We couldn’t find that upload. Please choose the file again.', 404);
  if (row.status !== 'pending') throw new UploadError('This upload is already finished.', 409);
  if (!body) throw new UploadError('The file was empty. Please choose it again.', 400);
  await getStorage().putStream(row.originalKey, body, Math.min(row.bytes, MAX_UPLOAD_BYTES));
}

export async function deleteUpload(row: UploadRow): Promise<void> {
  await getStorage().delete([row.originalKey, row.previewKey, row.thumbKey].filter((k): k is string => Boolean(k)));
  await db.delete(uploads).where(eq(uploads.id, row.id));
}

/**
 * Check an uploaded file and make its preview and thumbnail. Files that aren't
 * a printable PNG, JPG or WebP image are deleted.
 */
export async function processUpload(id: string): Promise<UploadInfo> {
  const row = await getUpload(id);
  if (!row) throw new UploadError('We couldn’t find that upload. Please choose the file again.', 404);
  if (row.status === 'ready') return toUploadInfo(row);

  // Loaded only here, so routes that just read upload rows (like the cart quote) don't load the image library.
  const { default: sharp } = await import('sharp');
  const storage = getStorage();
  const original = await storage.get(row.originalKey);
  if (!original) throw new UploadError('We didn’t receive the file. Please try uploading it again.', 409);

  const reject = async (message: string): Promise<never> => {
    await deleteUpload(row);
    throw new UploadError(message, 422);
  };

  let meta: Metadata;
  try {
    meta = await sharp(original, { limitInputPixels: MAX_UPLOAD_PIXELS }).metadata();
  } catch {
    return reject('We couldn’t read that file. Please upload a PNG, JPG or WebP image.');
  }
  if (!meta.format || !FORMATS.has(meta.format)) return reject('That file isn’t a PNG, JPG or WebP image. Please choose another file.');
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) return reject('We couldn’t read that image. Please choose another file.');
  if (width * height > MAX_UPLOAD_PIXELS) return reject('That image is over 100 megapixels. Please resize it and try again.');
  if (Math.min(width, height) < MIN_UPLOAD_SIDE) return reject(`That image is only ${width} × ${height} pixels, too small to print. Please upload a bigger one.`);

  let preview: Buffer;
  let thumb: Buffer;
  let hasAlpha = false;
  try {
    preview = await sharp(original, { limitInputPixels: MAX_UPLOAD_PIXELS, autoOrient: true })
      .resize({ width: PREVIEW_PX, height: PREVIEW_PX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 })
      .toBuffer();
    thumb = await sharp(preview).resize({ width: THUMB_PX, height: THUMB_PX, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    if (meta.hasAlpha) hasAlpha = !(await sharp(preview).stats()).isOpaque;
  } catch {
    return reject('We couldn’t process that image. It may be damaged; please try another file.');
  }

  const previewKey = `previews/${row.id}.webp`;
  const thumbKey = `thumbs/${row.id}.webp`;
  await Promise.all([storage.put(previewKey, preview), storage.put(thumbKey, thumb)]);
  const [done] = await db
    .update(uploads)
    .set({ status: 'ready', width, height, hasAlpha, previewKey, thumbKey, bytes: original.length })
    .where(eq(uploads.id, row.id))
    .returning();
  return toUploadInfo(done);
}

/** Preview or thumbnail bytes for a finished upload, and whether it's a public catalog photo. */
export async function readPreview(id: string, size: 'preview' | 'thumb'): Promise<{ data: Buffer; isPublic: boolean } | null> {
  const row = await getUpload(id);
  if (!row || row.status !== 'ready') return null;
  const key = size === 'thumb' ? row.thumbKey : row.previewKey;
  const data = key ? await getStorage().get(key) : null;
  return data ? { data, isPublic: row.kind === 'product' } : null;
}

/** Which of these upload ids exist and are ready to print. */
export async function readyUploadIds(ids: string[]): Promise<Set<string>> {
  const clean = [...new Set(ids.filter(isUploadId))];
  const found = new Set<string>();
  for (let i = 0; i < clean.length; i += 200) {
    const rows = await db
      .select({ id: uploads.id })
      .from(uploads)
      .where(and(inArray(uploads.id, clean.slice(i, i + 200)), eq(uploads.status, 'ready')));
    for (const r of rows) found.add(r.id);
  }
  return found;
}

/** Delete uploads that never became part of an order. Returns how many were removed. */
export async function deleteUnorderedUploads(olderThanSec: number): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSec;
  const rows = await db.select().from(uploads).where(and(eq(uploads.kind, 'custom'), isNull(uploads.orderId), lt(uploads.createdAt, cutoff)));
  for (const row of rows) await deleteUpload(row);
  return rows.length;
}
