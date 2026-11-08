'use client';

import Link from 'next/link';
import { BagIcon } from '@/components/icons';
import { CartLineRow, QuoteHints, QuoteSummary } from './cart-parts';
import { useQuote } from './use-quote';

export function CartView() {
  const { data, loading, hydrated, lines, error } = useQuote();
  if (!hydrated) return <div className="h-64 animate-pulse rounded-card border border-line bg-surface" aria-busy="true" />;
  if (lines.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-card border border-dashed border-line-2 px-6 py-20 text-center">
        <BagIcon size={48} className="text-line-2" />
        <p className="font-display text-3xl uppercase">Your cart is empty</p>
        <p className="text-muted">Find something for your laptop, wall or diary.</p>
        <Link href="/shop" className="btn btn-primary">
          Start shopping
        </Link>
      </div>
    );
  }
  const byKey = new Map(data?.lines.map((l) => [l.key, l]));
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((l) => (
          <CartLineRow key={l.key} line={l} priced={byKey.get(l.key)} />
        ))}
      </ul>
      <aside className="grid content-start gap-5">
        <div className="rounded-card border border-line bg-surface p-5">
          <QuoteHints data={data} />
        </div>
        <div className="rounded-card border border-line bg-surface p-5">
          <QuoteSummary data={data} loading={loading} />
          {error && <p className="mt-3 text-sm text-red">We couldn’t update prices just now. Check your connection and try again.</p>}
          <Link href="/checkout" className="btn btn-primary mt-5 w-full">
            Checkout
          </Link>
          <Link href="/shop" className="mt-3 block text-center text-sm font-bold uppercase tracking-[0.06em] text-muted hover:text-lime">
            Continue shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}
