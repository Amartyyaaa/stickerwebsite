'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QuoteResponse } from '@/lib/pricing/quote-types';
import { useCart } from '@/lib/store/cart';
import { useStoresHydrated } from '@/lib/store/hydration';

/**
 * Ask the server to price the cart whenever it changes. Lines the server can't
 * price any more (a removed product, say) are dropped from the cart.
 */
export function useQuote({ enabled = true, payment }: { enabled?: boolean; payment?: 'online' | 'cod' } = {}) {
  const hydrated = useStoresHydrated();
  const lines = useCart((s) => s.lines);
  const removeMany = useCart((s) => s.removeMany);
  const sig = useMemo(() => JSON.stringify([payment ?? '', lines.map((l) => [l.key, l.productId, l.options, l.qty])]), [lines, payment]);
  const [result, setResult] = useState<{ sig: string; data: QuoteResponse | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!hydrated || !enabled || !lines.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lines: lines.map((l) => ({ key: l.key, productId: l.productId, options: l.options, qty: l.qty })), payment }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as QuoteResponse;
        setResult({ sig, data: json, error: false });
        if (json.invalid.length) removeMany(json.invalid);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResult((prev) => ({ sig, data: prev?.data ?? null, error: true }));
      }
    }, 120);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [hydrated, enabled, lines, payment, sig, removeMany]);

  const data = lines.length ? (result?.data ?? null) : null;
  const loading = lines.length > 0 && result?.sig !== sig;
  const error = Boolean(result && result.sig === sig && result.error);
  return { data, loading, error, hydrated, lines };
}
