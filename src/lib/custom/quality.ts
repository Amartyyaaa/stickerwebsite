import type { Rect, Size } from './crop';

/**
 * Print sharpness: how many image pixels land on each printed inch. Zooming
 * into a crop uses fewer pixels, so the DPI drops.
 */

export type Quality = 'great' | 'ok' | 'low';

export interface DpiThresholds {
  great: number;
  ok: number;
}

/** Pixels per inch when the visible part of the image is printed at `area` inches. */
export function effectiveDpi(img: Size, area: Size, rect?: Rect): number {
  const px = img.w * (rect?.width ?? 1);
  const py = img.h * (rect?.height ?? 1);
  return Math.floor(Math.min(px / area.w, py / area.h));
}

export function qualityLevel(dpi: number, t: DpiThresholds): Quality {
  return dpi >= t.great ? 'great' : dpi >= t.ok ? 'ok' : 'low';
}

export const QUALITY_LABEL: Record<Quality, string> = {
  great: 'Sharp',
  ok: 'OK',
  low: 'Low resolution',
};
