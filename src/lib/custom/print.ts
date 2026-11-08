import { cropRect, DEFAULT_CROP } from './crop';
import type { Crop } from './types';

/**
 * How to make the print file from the original image (in its pixels, after
 * EXIF rotation): cut out the part of the image inside the shopper's crop,
 * and, when the crop reaches past the image (zoomed-out stickers), place
 * that part on a white canvas of the full print size.
 */
export interface PrintRegion {
  /** Size of the print file. */
  width: number;
  height: number;
  /** Part of the original to use. Null means the whole image as it is. */
  extract: { left: number; top: number; width: number; height: number } | null;
  /** Where the extracted part goes on a white canvas, or null when it fills the file. */
  place: { left: number; top: number } | null;
}

export function printRegion(img: { w: number; h: number }, aspect: number | null, crop: Crop | undefined, minZoom = 1): PrintRegion {
  // Die-cut stickers keep the whole image; the cut follows its outline.
  if (aspect === null) return { width: img.w, height: img.h, extract: null, place: null };
  const r = cropRect(img, aspect, crop ?? DEFAULT_CROP, minZoom);
  const wx = r.left * img.w;
  const wy = r.top * img.h;
  const width = Math.max(1, Math.round(r.width * img.w));
  const height = Math.max(1, Math.round(r.height * img.h));
  // The part of the window that actually has image in it.
  const x1 = Math.max(0, Math.round(wx));
  const y1 = Math.max(0, Math.round(wy));
  const x2 = Math.min(img.w, Math.round(wx + r.width * img.w));
  const y2 = Math.min(img.h, Math.round(wy + r.height * img.h));
  const extract = { left: x1, top: y1, width: Math.max(1, x2 - x1), height: Math.max(1, y2 - y1) };
  const fills = extract.width >= width && extract.height >= height;
  return {
    width,
    height,
    extract: fills ? { ...extract, width, height } : extract,
    place: fills ? null : { left: Math.max(0, Math.round(x1 - wx)), top: Math.max(0, Math.round(y1 - wy)) },
  };
}
