import { cn } from '@/lib/cn';

/** A row of five stars, filled to the rating. */
export function Stars({ rating, size = 16, className }: { rating: number; size?: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={cn('inline-flex leading-none', className)} role="img" aria-label={`${rating} out of 5 stars`} style={{ fontSize: size, letterSpacing: '0.06em' }}>
      <span className="text-lime">{'★'.repeat(full)}</span>
      <span className="text-line-2">{'★'.repeat(5 - full)}</span>
    </span>
  );
}
