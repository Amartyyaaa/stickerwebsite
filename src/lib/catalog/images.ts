import { uploadSrc } from '@/lib/custom/types';

/**
 * Product photos are uploads with kind "product", stored on the product as
 * their web address (/api/uploads/<id>). That address serves the 1600 px
 * preview; cards and carts use the 480 px thumbnail of the same photo.
 */

const UPLOAD_PATH = /^\/api\/uploads\/([A-Za-z0-9_-]{22})(?:\?size=thumb)?$/;

/** The upload id inside a stored photo address, or null for any other address. */
export function photoUploadId(src: string): string | null {
  return UPLOAD_PATH.exec(src)?.[1] ?? null;
}

export const photoSrc = (uploadId: string) => uploadSrc(uploadId);

/** The small version of a product photo, for cards, carts and orders. */
export function cardImage(src: string | null | undefined): string | null {
  if (!src) return null;
  const id = photoUploadId(src);
  return id ? uploadSrc(id, 'thumb') : src;
}

/** The full-size version, for the product page gallery. */
export function fullImage(src: string): string {
  const id = photoUploadId(src);
  return id ? uploadSrc(id) : src;
}
