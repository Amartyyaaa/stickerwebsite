'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ArtSpec } from '@/lib/art/types';
import { lineKey } from '@/lib/pricing/engine';

export interface CartLine {
  key: string;
  productId: number;
  slug: string;
  name: string;
  typeName: string;
  art: ArtSpec | null;
  image: string | null;
  options: Record<string, string>;
  optionLabels: string[];
  qty: number;
  /** Last known unit price in paise, for instant display. The server re-prices everything. */
  unit: number;
}

export type NewCartLine = Omit<CartLine, 'key' | 'qty'> & { qty?: number };

interface CartState {
  lines: CartLine[];
  open: boolean;
  lastAdded: string | null;
  add: (line: NewCartLine) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  removeMany: (keys: string[]) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

export const MAX_QTY = 99;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      lastAdded: null,
      add: (line) =>
        set((s) => {
          const key = lineKey(line.productId, line.options);
          const qty = Math.min(MAX_QTY, Math.max(1, line.qty ?? 1));
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty), unit: line.unit } : l))
            : [...s.lines, { ...line, key, qty }];
          return { lines, open: true, lastAdded: key };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      removeMany: (keys) => set((s) => ({ lines: s.lines.filter((l) => !keys.includes(l.key)) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: 'pyv-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      skipHydration: true,
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
