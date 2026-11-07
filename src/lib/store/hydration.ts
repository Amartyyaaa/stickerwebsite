'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useCart } from './cart';
import { useRecent, useWishlist } from './saved';

/**
 * Saved cart, wishlist and recently viewed items live in localStorage. They are
 * loaded after the first render so the server HTML and the first client render
 * match, then components re-render with the saved data.
 */
let hydrated = false;
const listeners = new Set<() => void>();

export function useStoresHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hydrated,
    () => false,
  );
}

export function useHydrateStores(): void {
  useEffect(() => {
    if (hydrated) return;
    Promise.all([useCart.persist.rehydrate(), useWishlist.persist.rehydrate(), useRecent.persist.rehydrate()]).finally(() => {
      hydrated = true;
      listeners.forEach((l) => l());
    });
  }, []);
}
