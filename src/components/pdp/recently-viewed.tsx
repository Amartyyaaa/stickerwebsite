'use client';

import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/product/product-card';
import { SectionHead } from '@/components/section-head';
import type { ProductCard } from '@/lib/catalog/types';
import { useStoresHydrated } from '@/lib/store/hydration';
import { useRecent } from '@/lib/store/saved';

export function RecentlyViewed({ exclude }: { exclude?: number }) {
  const hydrated = useStoresHydrated();
  const ids = useRecent((s) => s.ids);
  const [items, setItems] = useState<ProductCard[]>([]);
  const wanted = ids.filter((id) => id !== exclude).slice(0, 4);
  const key = wanted.join(',');

  useEffect(() => {
    if (!hydrated || !key) return;
    const ctrl = new AbortController();
    fetch(`/api/products?ids=${key}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => {});
    return () => ctrl.abort();
  }, [hydrated, key]);

  if (!key || items.length === 0) return null;
  return (
    <section className="pt-14" aria-labelledby="recent-title">
      <SectionHead id="recent-title" title="Recently viewed" />
      <ProductGrid products={items} idPrefix="rv" />
    </section>
  );
}
