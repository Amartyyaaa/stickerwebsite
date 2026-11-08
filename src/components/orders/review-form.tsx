'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { submitReviewAction } from '@/actions/reviews';
import { Art } from '@/components/art';
import { inputClass } from '@/components/checkout/fields';
import { FileButton } from '@/components/custom/drop-zone';
import { useUploadQueue } from '@/components/custom/use-upload-queue';
import { CloseIcon } from '@/components/icons';
import type { ArtSpec } from '@/lib/art/types';
import type { UploadInfo } from '@/lib/custom/types';
import { cn } from '@/lib/cn';
import { MAX_REVIEW_PHOTOS, MAX_REVIEW_TEXT } from '@/lib/review-rules';

export type ItemReviewState = 'pending' | 'approved' | 'rejected' | null;

const WORDS = ['', 'Poor', 'Not great', 'Good', 'Very good', 'Love it'];

/** "Write a review" for one item of a delivered order: stars, a few words and up to 3 photos. */
export function ItemReview({ order, item, state }: { order: { number: string; key: string }; item: { id: number; name: string; slug: string; art: ArtSpec | null; image: string | null }; state: ItemReviewState }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<UploadInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<ItemReviewState>(state);
  const uploads = useUploadQueue({ onDone: (info) => setPhotos((p) => (p.length < MAX_REVIEW_PHOTOS ? [...p, info] : p)) });
  const failed = uploads.pending.find((p) => p.error);
  const room = MAX_REVIEW_PHOTOS - photos.length - uploads.active;
  const id = `rv-${item.id}`;

  const submit = async () => {
    if (!rating) return setError('Choose from 1 to 5 stars.');
    setBusy(true);
    setError(null);
    const r = await submitReviewAction({ number: order.number, key: order.key, itemId: item.id, rating, body, photos: photos.map((p) => p.id) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone('pending');
    router.refresh();
  };

  return (
    <li className="grid gap-3 border-t border-line py-4 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3">
        <span className="relative size-12 shrink-0 rounded-[4px] border border-line bg-bg p-1">
          <Art spec={item.art} image={item.image} idPrefix={id} />
        </span>
        <span className="min-w-0 flex-1">
          <Link href={`/p/${item.slug}`} className="block truncate font-semibold hover:text-lime">
            {item.name}
          </Link>
          {done === 'pending' && <span className="text-[13px] text-lime">Thank you! Your review appears on the product page after a quick check.</span>}
          {done === 'approved' && <span className="text-[13px] text-lime">Your review is on the product page. Thank you!</span>}
          {done === 'rejected' && <span className="text-[13px] text-muted">Thanks for your review.</span>}
        </span>
        {!done && !open && (
          <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => setOpen(true)}>
            Write a review
          </button>
        )}
      </div>

      {!done && open && (
        <form
          className="grid gap-3 rounded-[3px] border border-line bg-bg p-3 sm:p-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset>
            <legend className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.07em]">Your rating</legend>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input type="radio" name={`${id}-rating`} value={n} checked={rating === n} onChange={() => (setRating(n), setError(null))} className="peer sr-only" />
                  <span
                    aria-hidden="true"
                    className={cn('grid size-10 place-items-center text-[28px] leading-none transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-cyan', n <= rating ? 'text-lime' : 'text-line-2 hover:text-muted')}
                  >
                    ★
                  </span>
                  <span className="sr-only">
                    {n} star{n === 1 ? '' : 's'}: {WORDS[n]}
                  </span>
                </label>
              ))}
              <span className="ml-2 text-sm text-muted">{WORDS[rating]}</span>
            </div>
          </fieldset>
          <label className="grid gap-1.5" htmlFor={`${id}-body`}>
            <span className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
              Your review <span className="font-semibold normal-case tracking-normal text-muted">(optional)</span>
            </span>
            <textarea
              id={`${id}-body`}
              rows={3}
              maxLength={MAX_REVIEW_TEXT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="How’s the print quality? How does it look on your wall, laptop or fridge?"
              className={cn(inputClass(), 'py-2.5')}
            />
          </label>
          <div className="grid gap-2">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.07em]">
              Photos <span className="font-semibold normal-case tracking-normal text-muted">(optional, up to {MAX_REVIEW_PHOTOS})</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((p, i) => (
                <span key={p.id} className="relative size-16 overflow-hidden rounded-[4px] border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setPhotos((x) => x.filter((y) => y.id !== p.id))} aria-label={`Remove photo ${i + 1}`} className="absolute right-0.5 top-0.5 grid size-6 place-items-center rounded-full bg-bg/80 text-ink">
                    <CloseIcon size={13} />
                  </button>
                </span>
              ))}
              {uploads.pending
                .filter((p) => !p.error)
                .map((p) => (
                  <span key={p.key} className="grid size-16 place-items-center rounded-[4px] border border-dashed border-line-2 text-[11px] text-muted">
                    {Math.round(p.progress * 100)}%
                  </span>
                ))}
              {room > 0 && (
                <FileButton multiple onFiles={(files) => uploads.add(files.slice(0, room))} className="min-h-16">
                  Add photos
                </FileButton>
              )}
            </div>
            {failed && <p className="text-[13px] font-semibold text-red">{failed.error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || uploads.active > 0}>
              {busy ? 'Sending…' : 'Send review'}
            </button>
            <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setOpen(false)}>
              Cancel
            </button>
            {error && (
              <p className="text-[13px] font-semibold text-red" role="alert">
                {error}
              </p>
            )}
          </div>
          <p className="text-xs text-muted">Reviews show your first name and initial, with a “Verified buyer” badge.</p>
        </form>
      )}
    </li>
  );
}
