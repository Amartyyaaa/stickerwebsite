'use client';

import { useEffect, useMemo, useState } from 'react';
import { designInputs } from '@/lib/custom/rules';
import type { QuoteResponse } from '@/lib/pricing/quote-types';
import { useCart, type CartLine } from '@/lib/store/cart';
import { useStoresHydrated } from '@/lib/store/hydration';

/** Cart lines in the shape the server prices (the quote API and checkout). */
export function requestLines(lines: CartLine[]) {
  return lines.map((l) => ({
    key: l.key,
    productId: l.productId,
    options: l.options,
    qty: l.qty,
    ...(l.custom && l.typeId ? { custom: { typeId: l.typeId, items: designInputs(l.custom), note: l.custom.note } } : {}),
  }));
}

/**
 * Ask the server to price the cart whenever it changes. Lines the server can't
 * price any more (a removed product, say) are dropped from the cart. A custom
 * line's key already changes with its design, so the key is enough to tell
 * when to ask again.
 */
export function useQuote({ enabled = true, payment, nonce = 0 }: { enabled?: boolean; payment?: 'online' | 'cod'; /** Change to fetch the prices again. */ nonce?: number } = {}) {
  const hydrated = useStoresHydrated();
  const lines = useCart((s) => s.lines);
  const removeMany = useCart((s) => s.removeMany);
  const sig = useMemo(() => JSON.stringify([payment ?? '', nonce, lines.map((l) => [l.key, l.productId, l.options, l.qty])]), [lines, payment, nonce]);
  const [result, setResult] = useState<{ sig: string; data: QuoteResponse | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!hydrated || !enabled || !lines.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ lines: requestLines(lines), payment }),
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
