'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BagIcon, CloseIcon } from '@/components/icons';
import { trapTab } from '@/lib/focus-trap';
import { cartCount, useCart } from '@/lib/store/cart';
import { CartLineRow, QuoteHints, QuoteSummary } from './cart-parts';
import { useQuote } from './use-quote';

export function CartDrawer() {
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const { data, loading, lines } = useQuote({ enabled: open });
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = cartCount(lines);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' ? setOpen(false) : trapTab(e, panelRef.current));
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, setOpen]);

  if (!open) return null;
  const close = () => setOpen(false);
  const byKey = new Map(data?.lines.map((l) => [l.key, l]));

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} aria-label="Close cart" tabIndex={-1} />
      <div ref={panelRef} className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-line bg-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 pb-4 pt-[calc(16px+env(safe-area-inset-top,0px))]">
          <h2 id="cart-title" className="font-display text-2xl uppercase">
            Your cart <span className="text-lime">({count})</span>
          </h2>
          <button ref={closeRef} type="button" onClick={close} className="grid size-10 place-items-center rounded-[2px] hover:bg-surface-2" aria-label="Close cart">
            <CloseIcon />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="grid flex-1 place-content-center gap-4 px-8 text-center">
            <BagIcon size={44} className="mx-auto text-line-2" />
            <p className="font-display text-2xl uppercase">Your cart is empty</p>
            <p className="text-muted">Stickers, posters and polaroids are waiting.</p>
            <Link href="/shop" onClick={close} className="btn btn-primary mx-auto">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5">
              <div className="border-b border-line py-4">
                <QuoteHints data={data} onNavigate={close} />
              </div>
              <ul className="divide-y divide-line">
                {lines.map((l) => (
                  <CartLineRow key={l.key} line={l} priced={byKey.get(l.key)} onNavigate={close} compact />
                ))}
              </ul>
            </div>
            <div className="border-t border-line bg-surface px-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-4">
              <QuoteSummary data={data} loading={loading} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/cart" onClick={close} className="btn btn-ghost">
                  View cart
                </Link>
                <Link href="/checkout" onClick={close} className="btn btn-primary">
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CartButton({ className }: { className?: string }) {
  const lines = useCart((s) => s.lines);
  const setOpen = useCart((s) => s.setOpen);
  const count = cartCount(lines);
  return (
    <button type="button" onClick={() => setOpen(true)} className={className} aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}>
      <BagIcon />
      {count > 0 && (
        <span className="absolute -right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] font-bold leading-[18px] text-bg tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
