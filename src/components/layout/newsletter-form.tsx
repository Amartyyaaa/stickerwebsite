'use client';

import { useActionState } from 'react';
import { subscribe, type SubscribeState } from '@/actions/newsletter';

export function NewsletterForm() {
  const [state, action, pending] = useActionState<SubscribeState | null, FormData>(subscribe, null);
  return (
    <form action={action} className="mt-4 max-w-sm">
      <label htmlFor="newsletter-email" className="text-sm font-semibold">
        Get new drops first
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 rounded-[2px] border border-line-2 bg-transparent px-3.5 text-[15px] placeholder:text-muted focus:border-lime focus:outline-none"
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? 'Joining…' : 'Join'}
        </button>
      </div>
      <p className={`mt-2 min-h-5 text-sm ${state?.ok ? 'text-lime' : 'text-red'}`} aria-live="polite">
        {state?.message}
      </p>
    </form>
  );
}
