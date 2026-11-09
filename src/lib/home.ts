import type { ArtSpec } from '@/lib/art/types';

/**
 * Home page artwork and tiles. The banner's words, buttons and photo are
 * edited in Admin → Home page (stored in settings); this artwork shows when
 * no photo is set.
 */
export const HERO_ART = {
  poster: { kind: 'poster', seed: 15, poster: 'speed', title: 'TOUGE RUN', dark: 0 } satisfies ArtSpec,
  stickerA: { kind: 'sticker', seed: 16, shape: 'badge', word: 'JDM', c1: 'a', c2: 'd' } satisfies ArtSpec,
  stickerB: { kind: 'sticker', seed: 17, shape: 'pill', word: 'NO DAYS OFF', c1: 'b', c2: 'f' } satisfies ArtSpec,
};

/** Product types shown as tiles on the home page, with their tile artwork. */
export const HOME_TILES: Array<{ typeId: string; art: ArtSpec }> = [
  { typeId: 'laptop-stickers', art: { kind: 'sticker', seed: 21, shape: 'blob', word: 'VIBE', c1: 'a', c2: 'e' } },
  { typeId: 'car-bike-stickers', art: { kind: 'decal', seed: 22, word: 'DRIFT', c1: 'c' } },
  { typeId: 'wall-posters', art: { kind: 'poster', seed: 23, poster: 'orbit', title: 'ZERO GRAVITY', dark: 0 } },
  { typeId: 'framed-posters', art: { kind: 'framed', seed: 24, poster: 'sunset', title: 'GOLDEN HOUR', frame: 'black', dark: 1 } },
  { typeId: 'polaroid-sets', art: { kind: 'polaroids', seed: 25, caption: 'best night', dark: 0 } },
  { typeId: 'phone-bottle-stickers', art: { kind: 'sticker', seed: 26, shape: 'cat', word: 'MEOW', c1: 'e', c2: 'b' } },
  { typeId: 'diary-sticker-sheets', art: { kind: 'sheet', seed: 27, title: 'main character' } },
  { typeId: 'bookmarks', art: { kind: 'bookmark', seed: 28, title: 'READ MORE' } },
];

export const CUSTOM_CARDS = [
  {
    href: '/custom/stickers',
    title: 'Custom stickers',
    body: 'Upload any image, pick a shape, size and finish, and see the die-cut before you pay.',
    cta: 'Upload your design',
    art: { kind: 'sticker', seed: 42, shape: 'blob', word: 'YOU', c1: 'f', c2: 'c' } satisfies ArtSpec,
  },
  {
    href: '/custom/polaroids',
    title: 'Custom polaroids',
    body: 'Upload 10 to 50 photos, crop them and add captions. Add clips and fairy lights if you like.',
    cta: 'Upload your photos',
    art: { kind: 'polaroids', seed: 51, caption: 'your photo', dark: 2 } satisfies ArtSpec,
  },
  {
    href: '/custom/posters',
    title: 'Custom posters',
    body: 'Turn a photo into a poster from A4 to A2, with a black, white or wood frame.',
    cta: 'Create a poster',
    art: { kind: 'framed', seed: 53, poster: 'sunset', title: 'YOUR PHOTO', frame: 'wood', dark: 3 } satisfies ArtSpec,
  },
];
