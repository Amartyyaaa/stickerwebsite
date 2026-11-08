/**
 * Shared types and limits for the custom studio. Safe to import in the browser
 * and on the server, so both check uploads against the same rules.
 */

export type StudioKind = 'stickers' | 'polaroids' | 'posters';

/** What the studio knows about an uploaded image once the server has checked it. */
export interface UploadInfo {
  id: string;
  /** The shopper's file name. */
  name: string;
  /** Pixel size, after the photo's EXIF rotation is applied. */
  w: number;
  h: number;
  /** True when the image has see-through areas (die-cut stickers follow them). */
  alpha: boolean;
  /** Web preview, up to 1600 px. */
  src: string;
  /** Thumbnail, up to 480 px. */
  thumb: string;
}

/**
 * How an image fills its frame: the centre of the visible part (0 to 1 across
 * the image) and how far it is zoomed in (1 = the whole frame is filled, no more).
 */
export interface Crop {
  x: number;
  y: number;
  zoom: number;
}

export interface DesignItem {
  upload: UploadInfo;
  caption?: string;
  crop?: Crop;
}

/** Everything the printer needs for one custom cart line. */
export interface CustomDesign {
  kind: StudioKind;
  items: DesignItem[];
  /** Optional note to the printer. */
  note?: string;
}

export const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_PIXELS = 100_000_000;
/** Images smaller than this on either side can't be printed usefully. */
export const MIN_UPLOAD_SIDE = 100;
export const UPLOAD_ID_RE = /^[A-Za-z0-9_-]{22}$/;
export const MAX_CAPTION = 28;
export const MAX_NOTE = 300;
export const MAX_ZOOM = 3;
/** Stickers can zoom out so a whole logo fits inside a circle or square, with a white margin. */
export const STICKER_MIN_ZOOM = 0.5;
export const minZoomFor = (kind: StudioKind) => (kind === 'stickers' ? STICKER_MIN_ZOOM : 1);

export const isUploadType = (t: string): t is UploadType => (UPLOAD_TYPES as readonly string[]).includes(t);

export const uploadSrc = (id: string, size: 'preview' | 'thumb' = 'preview') => `/api/uploads/${id}${size === 'thumb' ? '?size=thumb' : ''}`;
