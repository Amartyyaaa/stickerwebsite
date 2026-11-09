'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { BagIcon, ChatIcon, HeartIcon, HomeIcon, GridIcon, SparkleIcon } from '@/components/icons';
import { cartCount, useCart } from '@/lib/store/cart';
import { useHydrateStores } from '@/lib/store/hydration';

export interface Chat {
  /** The number as shown, like "+91 80028 98685". */
  number: string;
  href: string;
}

const FAB =
  'chat-fab fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-[max(16px,env(safe-area-inset-right,0px))] z-40 inline-flex size-[52px] items-center justify-center gap-2 rounded-full bg-lime text-bg shadow-[0_0_26px_rgb(198_255_61/0.35)] transition hover:bg-lime-2 md:bottom-[max(24px,env(safe-area-inset-bottom,0px))] md:size-auto md:min-h-[52px] md:px-5';

/** Floating WhatsApp button, the phone bottom bar, and loading saved cart data. */
export function Dock({ chats }: { chats: Chat[] }) {
  useHydrateStores();
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const count = cartCount(lines);

  const item = 'relative grid justify-items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-ink';
  return (
    <>
      <aside aria-label="Chat">
        {chats.length > 1 ? (
          <ChatChooser chats={chats} />
        ) : (
          <a
            href={chats[0]?.href ?? '/pages/contact'}
            {...(chats.length ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={FAB}
            aria-label="Chat with us on WhatsApp"
          >
            <ChatIcon />
            <span className="hidden text-[13px] font-bold uppercase tracking-[0.06em] md:inline">Chat with us</span>
          </a>
        )}
      </aside>
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
        <button type="button" onClick={() => setOpen(true)} className={item}>
          <BagIcon />
          Cart
          {count > 0 && (
            <>
              <span className="absolute right-[calc(50%-24px)] top-1 grid min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] leading-[18px] text-bg" aria-hidden="true">
                {count > 99 ? '99+' : count}
              </span>
              <span className="sr-only">
                , {count} item{count === 1 ? '' : 's'}
              </span>
            </>
          )}
        </button>
      </nav>
    </>
  );
}

/** With two WhatsApp numbers, the chat button opens a small menu to pick one. */
function ChatChooser({ chats }: { chats: Chat[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);
  return (
    <div ref={ref}>
      {open && (
        <div
          id={menuId}
          className="fixed bottom-[calc(140px+env(safe-area-inset-bottom,0px))] right-[max(16px,env(safe-area-inset-right,0px))] z-40 grid w-64 gap-1 rounded-card border border-line-2 bg-surface p-2 shadow-[0_12px_32px_rgb(0_0_0/0.5)] md:bottom-[calc(88px+env(safe-area-inset-bottom,0px))]"
        >
          <p className="px-2 pb-1 pt-0.5 text-sm text-muted">Chat with us on WhatsApp</p>
          {chats.map((c) => (
            <a
              key={c.href}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-[2px] px-2 font-semibold text-ink hover:bg-surface-2"
            >
              <ChatIcon />
              {c.number}
            </a>
          ))}
        </div>
      )}
      <button type="button" className={FAB} aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)} aria-label="Chat with us on WhatsApp">
        <ChatIcon />
        <span className="hidden text-[13px] font-bold uppercase tracking-[0.06em] md:inline">Chat with us</span>
      </button>
    </div>
  );
}
