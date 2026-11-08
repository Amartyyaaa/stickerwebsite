import { renderArt } from '@/lib/art/render';
import { SHEEN_KINDS, type ArtSpec, type FrameColor } from '@/lib/art/types';
import { cn } from '@/lib/cn';

/**
 * Inline SVG artwork for demo products (or an uploaded image for real ones).
 * Works in server and client components: the SVG is deterministic, so the
 * server and browser render exactly the same markup.
 */
export function Art({
  spec,
  image,
  label,
  className,
  frame,
  idPrefix,
}: {
  spec: ArtSpec | null;
  image?: string | null;
  label?: string;
  className?: string;
  frame?: FrameColor;
  idPrefix?: string;
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element -- product images come from your own storage
    return <img src={image} alt={label ?? ''} className={cn('h-full w-full object-contain', className)} loading="lazy" />;
  }
  if (!spec) return <div className={cn('art bg-surface-2', className)} aria-hidden="true" />;
  return (
    <div
      className={cn('art', SHEEN_KINDS.has(spec.kind) && 'sheen', className)}
      dangerouslySetInnerHTML={{ __html: renderArt(spec, { label, frame, idPrefix }) }}
    />
  );
}
