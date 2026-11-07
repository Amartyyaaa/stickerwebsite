import { MAX_ZOOM, type Crop } from './types';

/**
 * Crop maths shared by the studio previews, the crop editor and (later) the
 * print-file export. An image always fills its frame ("cover"); the crop says
 * which part of it shows. All values are fractions of the image (0 to 1).
 */

export interface Size {
  w: number;
  h: number;
}

/** The visible part of the image, as fractions of its width and height. */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, zoom: 1 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Keep a window of `size` (fraction of the image) inside the image, or the image inside the window when zoomed out. */
const place = (start: number, size: number) => (size <= 1 ? clamp(start, 0, 1 - size) : clamp(start, 1 - size, 0));

/**
 * Visible window of an image filling a frame of `aspect` (width ÷ height).
 * At zoom 1 or more the window stays inside the image. Below 1 (stickers only)
 * the whole image fits inside the frame with a margin around it.
 */
export function cropRect(img: Size, aspect: number, crop: Crop = DEFAULT_CROP, minZoom = 1): Rect {
  const imgAspect = img.w / img.h;
  let width = 1;
  let height = 1;
  if (imgAspect > aspect) width = aspect / imgAspect;
  else height = imgAspect / aspect;
  const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, minZoom, MAX_ZOOM);
  width /= zoom;
  height /= zoom;
  return { left: place(crop.x - width / 2, width), top: place(crop.y - height / 2, height), width, height };
}

/** The same crop with its centre moved back into range, rounded for storage. */
export function normalizeCrop(img: Size, aspect: number, crop: Crop, minZoom = 1): Crop {
  const r = cropRect(img, aspect, crop, minZoom);
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return { x: round(r.left + r.width / 2), y: round(r.top + r.height / 2), zoom: round(clamp(crop.zoom, minZoom, MAX_ZOOM)) };
}

/**
 * Move the image by a fraction of the frame's size (dragging right shows more
 * of the left side of the image).
 */
export function panCrop(img: Size, aspect: number, crop: Crop, dxFrame: number, dyFrame: number, minZoom = 1): Crop {
  const r = cropRect(img, aspect, crop, minZoom);
  return normalizeCrop(img, aspect, { x: r.left + r.width / 2 - dxFrame * r.width, y: r.top + r.height / 2 - dyFrame * r.height, zoom: crop.zoom }, minZoom);
}

export function zoomCrop(img: Size, aspect: number, crop: Crop, zoom: number, minZoom = 1): Crop {
  return normalizeCrop(img, aspect, { ...crop, zoom }, minZoom);
}

/** CSS for an absolutely positioned <img> inside the frame that shows exactly this crop. */
export function cropStyle(r: Rect): { width: string; height: string; left: string; top: string } {
  const pct = (n: number) => `${Math.round(n * 100000) / 1000}%`;
  return { width: pct(1 / r.width), height: pct(1 / r.height), left: pct(-r.left / r.width), top: pct(-r.top / r.height) };
}
