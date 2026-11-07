'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ArtSpec } from '@/lib/art/types';
import { customLineKey, designInputs } from '@/lib/custom/rules';
import type { CustomDesign } from '@/lib/custom/types';
import { lineKey } from '@/lib/pricing/engine';

export interface CartLine {
  key: string;
  /** Catalog product, or 0 for a custom-studio item (priced by its type instead). */
  productId: number;
  /** Product type. Lines saved before this field existed don't have it. */
  typeId?: string;
  slug: string;
  /** Where the line links to: the product page, or the studio for custom items. */
  href?: string;
  name: string;
  typeName: string;
  art: ArtSpec | null;
  image: string | null;
  options: Record<string, string>;
  optionLabels: string[];
  qty: number;
  /** Last known unit price in paise, for instant display. The server re-prices everything. */
  unit: number;
  /** Uploaded images, captions and crops for a custom-studio item. */
  custom?: CustomDesign;
}

export type NewCartLine = Omit<CartLine, 'key' | 'qty'> & { qty?: number };

interface CartState {
  lines: CartLine[];
  open: boolean;
  lastAdded: string | null;
  /** Add a line (or more of one). The drawer opens unless `open` is false. */
  add: (line: NewCartLine, opts?: { open?: boolean }) => void;
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
      add: (line, opts) =>
        set((s) => {
          const key =
            line.custom && line.typeId
              ? customLineKey(line.typeId, line.options, designInputs(line.custom), line.custom.note)
              : lineKey(line.productId, line.options);
          const qty = Math.min(MAX_QTY, Math.max(1, line.qty ?? 1));
          const existing = s.lines.find((l) => l.key === key);
          const lines = existing
            ? s.lines.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty), unit: line.unit } : l))
            : [...s.lines, { ...line, key, qty }];
          return { lines, open: opts?.open === false ? s.open : true, lastAdded: key };
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

export const lineHref = (l: Pick<CartLine, 'href' | 'slug'>) => l.href ?? `/p/${l.slug}`;
