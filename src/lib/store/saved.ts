'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WishlistState {
  ids: number[];
  toggle: (id: number) => boolean;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const on = !get().ids.includes(id);
        set((s) => ({ ids: on ? [id, ...s.ids].slice(0, 200) : s.ids.filter((x) => x !== id) }));
        return on;
      },
    }),
    { name: 'pyv-wishlist', version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

interface RecentState {
  ids: number[];
  push: (id: number) => void;
}

export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 12) })),
    }),
    { name: 'pyv-recent', version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
