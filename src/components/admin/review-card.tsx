'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { moderateReviewAction } from '@/actions/admin/reviews';
import { Stars } from '@/components/reviews/stars';
import type { AdminReview } from '@/lib/admin/reviews';
import { formatDateTime } from '@/lib/dates';

/** One review for moderation, with approve, reject and delete. */
export function ReviewCard({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: 'approve' | 'reject' | 'delete') => {
    if (action === 'delete' && !window.confirm('Delete this review and its photos? The buyer can’t review this item again.')) return;
    setBusy(true);
    setError(null);
    const r = await moderateReviewAction({ id: review.id, action });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.refresh();
  };
  return (
    <li className="grid gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Stars rating={review.rating} size={18} />
          <span className="font-semibold">{review.name}</span>
          <span className="text-[13px] text-muted">{formatDateTime(review.createdAt)}</span>
        </div>
        <span className="text-[13px] text-muted">
          <Link href={`/p/${review.productSlug}`} target="_blank" className="font-semibold text-ink hover:text-lime">
            {review.productName}
          </Link>{' '}
          ·{' '}
          <Link href={`/admin/orders/${review.orderNumber}`} className="hover:text-lime">
            {review.orderNumber}
          </Link>
        </span>
      </div>
      {review.body ? <p className="max-w-[75ch] whitespace-pre-line text-[15px] leading-relaxed">{review.body}</p> : <p className="text-sm text-muted">Stars only, no text.</p>}
      {review.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {review.photos.map((p, i) => (
            <a key={p.src} href={p.src} target="_blank" rel="noopener" className="block size-24 overflow-hidden rounded-[4px] border border-line hover:border-lime">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {review.status !== 'approved' && (
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act('approve')}>
            Approve
          </button>
        )}
        {review.status !== 'rejected' && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('reject')}>
            {review.status === 'approved' ? 'Hide' : 'Reject'}
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm border-red/50 text-red hover:border-red hover:text-red" disabled={busy} onClick={() => act('delete')}>
          Delete
        </button>
        {error && <p className="text-sm font-semibold text-red">{error}</p>}
      </div>
    </li>
  );
}
