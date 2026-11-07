'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { BagIcon, ChatIcon, HeartIcon, HomeIcon, GridIcon, SparkleIcon } from '@/components/icons';
import { cartCount, useCart } from '@/lib/store/cart';
import { useHydrateStores } from '@/lib/store/hydration';

/** Floating WhatsApp button, the phone bottom bar, and loading saved cart data. */
export function Dock({ whatsapp }: { whatsapp: string }) {
  useHydrateStores();
  // The pack page has a sticky progress bar at the bottom; lift the chat button above it.
  const raised = usePathname() === '/build-your-pack';
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const count = cartCount(lines);
  const digits = whatsapp.replace(/\D/g, '');
  const chatHref = digits ? `https://wa.me/${digits}?text=${encodeURIComponent('Hi PrintYourVibe!')}` : '/pages/contact';

  const item = 'relative grid justify-items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-ink';
  return (
    <>
      <a
        href={chatHref}
        {...(digits ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn(
          'fixed right-[max(16px,env(safe-area-inset-right,0px))] z-40 inline-flex size-[52px] items-center justify-center gap-2 rounded-full bg-lime text-bg shadow-[0_0_26px_rgb(198_255_61/0.35)] transition hover:bg-lime-2 md:size-auto md:min-h-[52px] md:px-5',
          raised
            ? 'bottom-[calc(152px+env(safe-area-inset-bottom,0px))] md:bottom-[max(112px,env(safe-area-inset-bottom,0px))]'
            : 'bottom-[calc(76px+env(safe-area-inset-bottom,0px))] md:bottom-[max(24px,env(safe-area-inset-bottom,0px))]',
        )}
        aria-label="Chat with us on WhatsApp"
      >
        <ChatIcon />
        <span className="hidden text-[13px] font-bold uppercase tracking-[0.06em] md:inline">Chat with us</span>
      </a>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] backdrop-blur md:hidden"
        aria-label="Quick links"
      >
        <Link href="/" className={item}>
          <HomeIcon />
          Home
        </Link>
        <Link href="/shop" className={item}>
          <GridIcon />
          Shop
        </Link>
        <Link href="/custom/stickers" className={item}>
          <SparkleIcon />
          Custom
        </Link>
        <Link href="/wishlist" className={item}>
          <HeartIcon />
          Saved
        </Link>
        <button type="button" onClick={() => setOpen(true)} className={item} aria-label={`Open cart, ${count} items`}>
          <BagIcon />
          Cart
          {count > 0 && (
            <span className="absolute right-[calc(50%-24px)] top-1 grid min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] leading-[18px] text-white">{count > 99 ? '99+' : count}</span>
          )}
        </button>
      </nav>
    </>
  );
}
