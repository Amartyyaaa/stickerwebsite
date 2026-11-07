import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PolaroidStudio } from '@/components/custom/polaroid-studio';
import { PosterStudio } from '@/components/custom/poster-studio';
import { StickerStudio } from '@/components/custom/sticker-studio';
import { StudioTabs } from '@/components/custom/studio-tabs';
import { CheckIcon } from '@/components/icons';
import { getCustomType } from '@/lib/catalog/queries';
import { isStudioKind, STUDIO_KINDS, STUDIOS } from '@/lib/custom/studios';
import type { StudioKind } from '@/lib/custom/types';

const STEPS: Record<StudioKind, [string, string][]> = {
  stickers: [
    ['Upload your design', 'A logo, drawing, photo or meme. PNG, JPG or WebP, up to 25 MB.'],
    ['Pick the shape and finish', 'Die-cut, circle, square or rounded, in matte, glossy, holographic or transparent vinyl.'],
    ['We print and ship', 'We check your design, print it on waterproof vinyl and ship it anywhere in India.'],
  ],
  polaroids: [
    ['Upload your photos', 'Straight from your phone is perfect. Add up to 50 at once.'],
    ['Crop and caption', 'Move each photo in its frame and add a short handwritten-style caption.'],
    ['We print and ship', 'We check every photo, print the set on thick photo card and ship it anywhere in India.'],
  ],
  posters: [
    ['Upload your image', 'A photo, artwork or design. PNG, JPG or WebP, up to 25 MB.'],
    ['Pick the size and frame', 'A4 to A2 or 12 × 18 in, matte or glossy, with or without a frame. Check it on the wall.'],
    ['We print and ship', 'We check your image, print it on 300 GSM paper and ship it flat in a rigid mailer.'],
  ],
};

const TIPS: Record<StudioKind, string[]> = {
  stickers: [
    'For a die-cut sticker, use a PNG with a transparent background. The cut follows its outline.',
    'Use at least 1,000 pixels across for a 4 in sticker, and 500 for a 2 in one.',
    'Keep text and important details a little away from the edge.',
  ],
  polaroids: [
    'Faces look best near the middle of the frame. Use Crop to adjust each photo.',
    'Photos from any recent phone are sharp enough. Screenshots and forwarded images may not be.',
    'Captions print in a handwriting-style font, up to 28 characters.',
  ],
  posters: [
    'For a sharp A3 poster, use at least 1,750 × 2,480 pixels. For A2, 2,480 × 3,500.',
    'Photos from recent phones print well up to A3. Images saved from social media are usually too small for big posters.',
    'Leave some space around important details. Frames cover about 3 mm at each edge.',
  ],
};

/** Every page here is built from cached data, so it is served as a complete static page and unknown URLs get a real 404. */
export const ensureStatic = 'navigation';

export function generateStaticParams() {
  return STUDIO_KINDS.map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: PageProps<'/custom/[kind]'>): Promise<Metadata> {
  const { kind } = await params;
  if (!isStudioKind(kind)) return { title: 'Custom studio' };
  return { title: STUDIOS[kind].title, description: STUDIOS[kind].description };
}

export default function CustomPage({ params }: PageProps<'/custom/[kind]'>) {
  return (
    <div className="wrap py-8 md:py-10">
      <Suspense fallback={<StudioSkeleton />}>
        <Studio params={params} />
      </Suspense>
    </div>
  );
}

function StudioSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-9 grid gap-4 border-b border-line pb-6">
        <div className="h-4 w-28 rounded-[2px] bg-surface-2" />
        <div className="h-14 w-72 max-w-full rounded-[2px] bg-surface-2" />
        <div className="h-5 w-full max-w-xl rounded-[2px] bg-surface" />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-card bg-surface" />
        <div className="grid content-start gap-4">
          <div className="h-24 rounded-card bg-surface" />
          <div className="h-24 rounded-card bg-surface" />
          <div className="h-48 rounded-card bg-surface" />
        </div>
      </div>
    </div>
  );
}

/** Reads the URL inside Suspense, so the shared page shell stays the same for every studio. */
async function Studio({ params }: { params: PageProps<'/custom/[kind]'>['params'] }) {
  const { kind } = await params;
  if (!isStudioKind(kind)) notFound();
  const studio = STUDIOS[kind];
  const type = await getCustomType(studio.typeId);
  if (!type) notFound();

  return (
    <>
      <header className="mb-7 grid gap-4 border-b border-line pb-6 md:mb-9">
        <div>
          <p className="eyebrow">Custom studio</p>
          <h1 className="display mt-2 text-[clamp(38px,5.4vw,66px)]">{studio.title}</h1>
          <p className="mt-3 max-w-2xl text-[16px] text-muted">{studio.blurb}</p>
        </div>
        <StudioTabs active={kind} />
      </header>

      {kind === 'stickers' ? <StickerStudio type={type} /> : kind === 'polaroids' ? <PolaroidStudio type={type} /> : <PosterStudio type={type} />}

      <section className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1.4fr_1fr]" aria-labelledby="how-title">
        <div>
          <h2 id="how-title" className="section-title">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS[kind].map(([title, body], i) => (
              <li key={title} className="card p-4">
                <span className="font-display text-3xl leading-none text-lime">{i + 1}</span>
                <p className="mt-2 font-display text-lg uppercase leading-tight">{title}</p>
                <p className="mt-1.5 text-sm text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="section-title">Print tips</h2>
          <ul className="mt-6 grid gap-2.5">
            {TIPS[kind].map((t) => (
              <li key={t} className="flex gap-2 text-[15px]">
                <CheckIcon size={18} className="mt-0.5 shrink-0 text-lime" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-[3px] border border-line-2 bg-surface px-3.5 py-3 text-[13.5px] text-muted">
            Only upload images you have the right to print. We may turn down designs that use someone else’s artwork, logos or photos without permission.
          </p>
        </div>
      </section>
    </>
  );
}
