import type { Metadata } from 'next';
import { TrackForm } from '@/components/track/track-form';

export const metadata: Metadata = { title: 'Track your order', description: 'Check where your PrintYourVibe order is with your order number and phone number.' };

export default function TrackPage() {
  return (
    <div className="wrap py-8 md:py-10">
      <header className="mb-8 border-b border-line pb-6">
        <p className="eyebrow">Orders</p>
        <h1 className="display mt-2 text-[clamp(38px,5.4vw,64px)]">Track your order</h1>
        <p className="mt-3 max-w-xl text-muted">Enter your order number and the mobile number you used at checkout.</p>
      </header>
      <TrackForm />
    </div>
  );
}
