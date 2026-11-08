import { formatDate } from '@/lib/dates';
import type { RatingSummary } from '@/lib/review-rules';
import type { ReviewView } from '@/lib/reviews';
import { CheckIcon } from '@/components/icons';
import { Stars } from './stars';

/** Approved reviews on a product page: the average, how the stars split, and each review with its photos. */
export function ProductReviews({ summary, reviews }: { summary: RatingSummary; reviews: ReviewView[] }) {
  if (!summary.count) return null;
  return (
    <section id="reviews" className="mt-14 grid scroll-mt-24 gap-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:gap-12" aria-labelledby="reviews-title">
      <div>
        <h2 id="reviews-title" className="section-title">
          Reviews
        </h2>
        <p className="mt-4 flex items-baseline gap-3">
          <span className="font-display text-6xl leading-none text-lime tabular-nums">{summary.average.toFixed(1)}</span>
          <span className="grid gap-1">
            <Stars rating={summary.average} size={18} />
            <span className="text-sm text-muted">
              {summary.count} review{summary.count === 1 ? '' : 's'} from buyers
            </span>
          </span>
        </p>
        <ul className="mt-5 grid max-w-xs gap-1.5 text-[13px]">
          {summary.stars.map((n, i) => (
            <li key={i} className="grid grid-cols-[3.5em_1fr_2.5em] items-center gap-2">
              <span className="text-muted">{5 - i} star</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-lime" style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} />
              </span>
              <span className="text-right tabular-nums text-muted">{n}</span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="grid content-start gap-6">
        {reviews.map((r) => (
          <li key={r.id} className="grid gap-2 border-b border-line pb-6 last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars rating={r.rating} />
              <span className="font-semibold">{r.name}</span>
              <span className="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.06em] text-lime">
                <CheckIcon size={14} /> Verified buyer
              </span>
              <span className="text-[13px] text-muted">{formatDate(r.createdAt)}</span>
            </div>
            {r.body && <p className="max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-[#d4d4e0]">{r.body}</p>}
            {r.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.photos.map((p, i) => (
                  <a key={p.src} href={p.src} target="_blank" rel="noopener" className="block size-20 overflow-hidden rounded-[4px] border border-line hover:border-lime">
                    {/* eslint-disable-next-line @next/next/no-img-element -- review photos come from the store's own uploads */}
                    <img src={p.thumb} alt={`Photo ${i + 1} from ${r.name}`} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
