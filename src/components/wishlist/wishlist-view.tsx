'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HeartIcon } from '@/components/icons';
import { ProductGrid } from '@/components/product/product-card';
import type { ProductCard } from '@/lib/catalog/types';
import { useStoresHydrated } from '@/lib/store/hydration';
import { useWishlist } from '@/lib/store/saved';

export function WishlistView() {
  const hydrated = useStoresHydrated();
  const ids = useWishlist((s) => s.ids);
  const [fetched, setFetched] = useState<{ key: string; items: ProductCard[] } | null>(null);
  const key = ids.slice(0, 60).join(',');

  useEffect(() => {
    if (!hydrated || !key) return;
    const ctrl = new AbortController();
    fetch(`/api/products?ids=${key}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((items: ProductCard[]) => setFetched({ key, items }))
      .catch(() => {});
    return () => ctrl.abort();
  }, [hydrated, key]);

  const items = !key ? [] : fetched && fetched.key === key ? fetched.items : fetched ? fetched.items : null;
  if (!hydrated || items === null) return <div className="h-64 animate-pulse rounded-card border border-line bg-surface" aria-busy="true" />;
  const visible = items.filter((p) => ids.includes(p.id));
  if (visible.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-card border border-dashed border-line-2 px-6 py-20 text-center">
        <HeartIcon size={48} className="text-line-2" />
        <p className="font-display text-3xl uppercase">Nothing saved yet</p>
        <p className="text-muted">Tap the heart on any design to save it here.</p>
        <Link href="/shop" className="btn btn-primary">
          Browse designs
        </Link>
      </div>
    );
  }
  return (
    <>
      <h2 className="sr-only">Saved designs</h2>
      <ProductGrid products={visible} idPrefix="wl" />
    </>
  );
}
