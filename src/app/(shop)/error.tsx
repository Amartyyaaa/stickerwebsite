'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Shown if a shop page fails unexpectedly: try again, or reach us. Your cart is kept in the browser either way. */
export default function ShopError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const ref = error instanceof Error && 'digest' in error ? String((error as Error & { digest?: string }).digest ?? '') : '';
  return (
    <div className="wrap grid min-h-[60vh] content-center justify-items-center gap-4 py-16 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="display text-[clamp(36px,5vw,60px)]">That didn’t load</h1>
      <p className="max-w-md text-muted">It’s probably a hiccup on our side. Your cart is safe. Try again, or come back in a minute.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-primary" onClick={() => retry()}>
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Go to the home page
        </Link>
      </div>
      <Link href="/pages/contact" className="text-sm text-muted underline underline-offset-2 hover:text-ink">
        Still stuck? Contact us
      </Link>
      {ref && <p className="text-xs text-muted">Reference: {ref}</p>}
    </div>
  );
}
