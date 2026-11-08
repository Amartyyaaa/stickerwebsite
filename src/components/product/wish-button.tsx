'use client';

import { HeartIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { useStoresHydrated } from '@/lib/store/hydration';
import { useWishlist } from '@/lib/store/saved';

export function WishButton({ id, name, className, variant = 'icon' }: { id: number; name: string; className?: string; variant?: 'icon' | 'button' }) {
  const hydrated = useStoresHydrated();
  const saved = useWishlist((s) => s.ids.includes(id));
  const toggle = useWishlist((s) => s.toggle);
  const on = hydrated && saved;

  if (variant === 'button') {
    return (
      <button type="button" className={cn('btn btn-ghost', on && 'border-red text-red', className)} aria-pressed={on} onClick={() => toggle(id)}>
        <HeartIcon size={18} fill={on ? 'currentColor' : 'none'} />
        {on ? 'Saved' : 'Save'}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from your wishlist` : `Save ${name} to your wishlist`}
      className={cn(
        'grid size-9 place-items-center rounded-full border border-line-2 bg-bg/75 backdrop-blur transition hover:border-red',
        on ? 'text-red' : 'text-ink',
        className,
      )}
    >
      <HeartIcon size={18} fill={on ? 'currentColor' : 'none'} />
    </button>
  );
}
