'use client';

import { useEffect } from 'react';

/**
 * Marks <html data-ready> once the page is interactive, for the browser tests. The shop sets it
 * after loading saved carts (src/lib/store/hydration.ts); the admin, which has none, uses this.
 */
export function ReadyMarker() {
  useEffect(() => {
    document.documentElement.dataset.ready = '1';
  }, []);
  return null;
}
