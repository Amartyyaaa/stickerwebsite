import type { Metadata } from 'next';
import { WishlistView } from '@/components/wishlist/wishlist-view';

export const metadata: Metadata = { title: 'Your wishlist', robots: { index: false } };

export default function WishlistPage() {
  return (
    <div className="wrap py-8 md:py-10">
      <h1 className="display mb-2 text-[clamp(40px,6vw,72px)]">Wishlist</h1>
      <p className="mb-6 text-muted">Saved on this device. Sign-in to keep it across devices arrives with accounts.</p>
      <WishlistView />
    </div>
  );
}
