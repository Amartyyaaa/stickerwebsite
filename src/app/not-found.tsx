import Link from 'next/link';
import { Art } from '@/components/art';

export default function NotFound() {
  return (
    <div className="wrap grid items-center gap-8 py-14 md:grid-cols-[1.1fr_1fr]">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="display mt-2 text-[clamp(48px,8vw,104px)]">Wrong turn</h1>
        <p className="mt-4 max-w-md text-[17px] text-muted">This page doesn’t exist, or the design was removed. Try searching, or head back to the shop.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="btn btn-primary">
            Browse designs
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[320px]" aria-hidden="true">
        <Art spec={{ kind: 'sticker', seed: 404, shape: 'blob', word: '404', c1: 'b', c2: 'f' }} idPrefix="nf" />
      </div>
    </div>
  );
}
