import type { Metadata } from 'next';
import { ComingSoon } from '@/components/coming-soon';

export const metadata: Metadata = { title: 'Your account', robots: { index: false } };

export default function AccountPage() {
  return (
    <ComingSoon
      kicker="Account"
      title="Accounts are coming"
      body="Sign in with an email code or Google to see your orders, track deliveries and keep your wishlist on every device."
      points={['Order history with a live status timeline', 'Saved addresses for faster checkout', 'Wishlist synced across devices']}
      art={{ kind: 'sticker', seed: 72, shape: 'badge', word: 'HELLO', c1: 'f', c2: 'c' }}
      step="Coming in Step 3: accounts, checkout and payments"
    />
  );
}
