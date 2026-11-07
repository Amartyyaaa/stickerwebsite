import type { Options } from '@/lib/pricing/engine';
import { maxItems } from './studios';
import { MAX_CAPTION, MAX_NOTE, MAX_ZOOM, minZoomFor, UPLOAD_ID_RE, type Crop, type CustomDesign, type StudioKind } from './types';

/** What the cart sends the server for each image in a custom design. */
export interface DesignInput {
  id: string;
  caption?: string;
  crop?: Crop;
}

/** The part of a design the server needs: upload ids, captions and crops. */
export function designInputs(design: CustomDesign): DesignInput[] {
  return design.items.map((i) => {
    const caption = i.caption?.trim();
    return { id: i.upload.id, ...(caption ? { caption } : {}), ...(i.crop ? { crop: i.crop } : {}) };
  });
}

/**
 * Check a custom design against the studio's rules. Returns a reason when it
 * can't be printed as ordered, or null when it's fine. Used by the studio
 * before adding to the cart, and again by the server when pricing.
 */
export function checkDesign(kind: StudioKind, options: Options, items: DesignInput[], note?: string): string | null {
  if (items.length === 0) return 'Add an image first.';
  const max = maxItems(kind, options);
  if (items.length > max) return kind === 'polaroids' ? `This set holds ${max} photos. Choose a bigger set or remove ${items.length - max}.` : 'Only one image fits here.';
  for (const item of items) {
    if (!UPLOAD_ID_RE.test(item.id)) return 'One of the images is missing. Please upload it again.';
    if (item.caption !== undefined) {
      if (kind !== 'polaroids') return 'Captions are only for polaroids.';
      if (item.caption.length > MAX_CAPTION) return `Captions can be up to ${MAX_CAPTION} characters.`;
    }
    const c = item.crop;
    // The centre always stays within the image (0 to 1), even when a sticker is zoomed out.
    if (c && !(c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1 && c.zoom >= minZoomFor(kind) && c.zoom <= MAX_ZOOM)) return 'One of the crops is out of range. Please reset it.';
  }
  if (note && note.length > MAX_NOTE) return `Notes can be up to ${MAX_NOTE} characters.`;
  return null;
}

/** FNV-1a, 32-bit, as base 36: short and stable. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Cart key for a custom line. Adding exactly the same design again adds to its
 * quantity; any change (another image, caption, crop or option) is a new line.
 */
export function customLineKey(typeId: string, options: Options, items: DesignInput[], note?: string): string {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('&');
  const parts = items.map((i) => [i.id, i.caption ?? '', i.crop ? [i.crop.x, i.crop.y, i.crop.zoom].join(',') : ''].join('|'));
  return `custom:${typeId}:${hash(JSON.stringify([opts, parts, note ?? '']))}`;
}
