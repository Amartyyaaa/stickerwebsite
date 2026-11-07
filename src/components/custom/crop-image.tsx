import { cn } from '@/lib/cn';
import { cropRect, cropStyle, DEFAULT_CROP } from '@/lib/custom/crop';
import type { Crop } from '@/lib/custom/types';

/** An image filling a frame of the given aspect, showing exactly the chosen crop. */
export function CropImage({
  src,
  img,
  aspect,
  crop,
  alt = '',
  className,
  imgClassName,
  minZoom,
  style,
}: {
  src: string;
  img: { w: number; h: number };
  aspect: number;
  crop?: Crop;
  alt?: string;
  className?: string;
  imgClassName?: string;
  /** Below 1 the image can shrink inside the frame (stickers). */
  minZoom?: number;
  style?: React.CSSProperties;
}) {
  const pos = img.w && img.h ? cropStyle(cropRect(img, aspect, crop ?? DEFAULT_CROP, minZoom)) : { width: '100%', height: '100%', left: '0%', top: '0%' };
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ aspectRatio: String(aspect), ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- previews of the shopper's own uploads */}
      <img src={src} alt={alt} draggable={false} className={cn('absolute max-w-none select-none', imgClassName)} style={pos} />
    </div>
  );
}
