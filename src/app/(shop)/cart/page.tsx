import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';

export const metadata: Metadata = { title: 'Your cart', robots: { index: false } };

export default function CartPage() {
  return (
    <div className="wrap py-8 md:py-10">
      <h1 className="display mb-6 text-[clamp(40px,6vw,72px)]">Your cart</h1>
      <CartView />
    </div>
  );
}
