import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <ComingSoon
      kicker="Checkout"
      title="Checkout is next"
      body="Your cart is saved on this device. Checkout with address, delivery and payment is being built in the next step."
      points={['Guest checkout or sign in with email or Google', 'Indian address form with pincode check', 'Pay by UPI, cards, netbanking or wallets through Razorpay', 'Or Cash on Delivery', 'Order confirmation email and order tracking']}
      art={{ kind: 'sticker', seed: 71, shape: 'pill', word: 'SOON', c1: 'a', c2: 'd' }}
      step="Coming in Step 3: accounts, checkout and payments"
    />
  );
}
