/**
 * Placeholder artwork is described by a small JSON "spec" stored on each
 * sample product and turned into an inline SVG by `renderArt`. Real products
 * use uploaded images instead and leave `art` empty.
 */
import type { Motif } from './motifs';

export type PaletteKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'dark' | 'dark2';

export type StickerShape = 'blob' | 'star' | 'badge' | 'pill' | 'heart' | 'cat' | 'moon';

export type PosterKind = 'speed' | 'sunset' | 'orbit' | 'bloom' | 'grid' | 'wave';

export type FrameColor = 'none' | 'black' | 'white' | 'wood';

export type Scene = 'rain' | 'beach' | 'night';

export type ArtKind =
  | 'sticker'
  | 'holo'
  | 'clear'
  | 'motion'
  | 'dome'
  | 'magnet'
  | 'decal'
  | 'sheet'
  | 'pack'
  | 'poster'
  | 'framed'
  | 'split'
  | 'poster-set'
  | 'collage'
  | 'mini-posters'
  | 'polaroids'
  | 'polaroid-kit'
  | 'bookmark'
  | 'postcard'
  | 'keychain'
  | 'badge'
  | 'phone-skin'
  | 'laptop-skin';

export interface ArtSpec {
  kind: ArtKind;
  seed: number;
  /** Short word printed on stickers, badges and decals. */
  word?: string;
  /** Title printed on posters, postcards and bookmarks. */
  title?: string;
  shape?: StickerShape;
  c1?: PaletteKey;
  c2?: PaletteKey;
  poster?: PosterKind;
  /** Index into the dark background pairs used by posters. */
  dark?: number;
  frame?: FrameColor;
  scene?: Scene;
  caption?: string;
  /** A theme symbol (src/lib/art/motifs.ts) drawn on stickers, decals and posters. Older designs have none. */
  motif?: Motif;
}

/** Art kinds that get the animated holographic sheen in the UI. */
export const SHEEN_KINDS: ReadonlySet<ArtKind> = new Set(['holo', 'motion']);
