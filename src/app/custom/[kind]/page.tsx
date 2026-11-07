import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ComingSoon } from '@/components/coming-soon';
import type { ArtSpec } from '@/lib/art/types';

const STUDIOS: Record<string, { title: string; body: string; points: string[]; art: ArtSpec }> = {
  stickers: {
    title: 'Custom stickers',
    body: 'Upload any image or logo and we’ll print it as a die-cut sticker. You’ll see the cut line before you pay.',
    points: ['Upload PNG, JPG or WebP', 'Choose die-cut, circle, square or rounded shapes', 'Sizes from 2 to 4 inches, or custom', 'Matte, glossy, holographic or transparent', 'Bigger quantities cost less per sticker', 'A warning if your image is too low-resolution to print sharply'],
    art: { kind: 'sticker', seed: 42, shape: 'blob', word: 'YOU', c1: 'f', c2: 'c' },
  },
  polaroids: {
    title: 'Custom polaroids',
    body: 'Turn your photos into polaroid-style prints with a white border and a handwritten-style caption.',
    points: ['Upload 10 to 50 photos at once', 'Crop each photo to the polaroid frame', 'Add a caption to each print', 'Add mini clips, string and fairy lights'],
    art: { kind: 'polaroids', seed: 51, caption: 'your photo', dark: 2 },
  },
  posters: {
    title: 'Custom posters',
    body: 'Turn a photo or artwork into a poster, and see it on a wall before you order.',
    points: ['A4, A3, A2 and 12 × 18 in', 'Matte or glossy 300 GSM paper', 'Black, white or wood frames', 'Preview on a wall mock-up'],
    art: { kind: 'framed', seed: 53, poster: 'sunset', title: 'YOUR PHOTO', frame: 'wood', dark: 3 },
  },
};

/** Every page here is built from cached data, so it is served as a complete static page and unknown URLs get a real 404. */
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return Object.keys(STUDIOS).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: PageProps<'/custom/[kind]'>): Promise<Metadata> {
  const { kind } = await params;
  return { title: STUDIOS[kind]?.title ?? 'Custom studio' };
}

export default async function CustomPage({ params }: PageProps<'/custom/[kind]'>) {
  const { kind } = await params;
  const s = STUDIOS[kind];
  if (!s) notFound();
  return <ComingSoon kicker="Custom studio" title={s.title} body={s.body} points={s.points} art={s.art} step="Coming in Step 2: the custom studio and build-your-own packs" />;
}
