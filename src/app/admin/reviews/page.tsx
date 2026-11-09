import { Suspense } from 'react';
import { ReviewCard } from '@/components/admin/review-card';
import { AdminHeader, Pager, Tabs } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { listReviews, REVIEW_TABS, reviewCounts, REVIEWS_PER_PAGE, type ReviewTab } from '@/lib/admin/reviews';
import { buildQuery } from '@/lib/catalog/filters';
import { formatDate } from '@/lib/dates';
import { feedbackSummary } from '@/lib/orders/shopper';

export const metadata = { title: 'Reviews' };

const LABEL: Record<ReviewTab, string> = { pending: 'Waiting', approved: 'Approved', rejected: 'Rejected' };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Reviews({ searchParams }: { searchParams: PageProps<'/admin/reviews'>['searchParams'] }) {
  if (!(await adminOrNull())) return null;
  const sp = await searchParams;
  const tab = (REVIEW_TABS as readonly string[]).includes(first(sp.tab) ?? '') ? (first(sp.tab) as ReviewTab) : 'pending';
  const page = Math.max(1, Number.parseInt(first(sp.page) ?? '1', 10) || 1);
  const [{ rows, total }, counts] = await Promise.all([listReviews(tab, page), reviewCounts()]);
  const href = (t: ReviewTab, p = 1) => `/admin/reviews${buildQuery({ tab: t === 'pending' ? undefined : t, page: p > 1 ? p : undefined })}`;
  return (
    <>
      <Tabs items={REVIEW_TABS.map((t) => ({ href: href(t), label: LABEL[t], count: counts[t], active: t === tab }))} />
      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-2 p-8 text-center text-muted">
          {tab === 'pending' ? 'No reviews waiting. Buyers can review items once their order is delivered.' : `No ${LABEL[tab].toLowerCase()} reviews.`}
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </ul>
      )}
      <Pager page={page} perPage={REVIEWS_PER_PAGE} total={total} href={(p) => href(tab, p)} />
      <ShoppingExperience />
    </>
  );
}

/** Ratings shoppers give right after ordering. Private to the store; not shown on product pages. */
async function ShoppingExperience() {
  const { count, average, latest } = await feedbackSummary();
  return (
    <section aria-labelledby="experience-title" className="mt-10 grid gap-3">
      <h2 id="experience-title" className="font-display text-2xl uppercase">
        Shopping experience
      </h2>
      <p className="text-sm text-muted">
        {count
          ? `${average!.toFixed(1)} out of 5 from ${count} order${count === 1 ? '' : 's'}. Shoppers rate their order right after placing it; only you see these.`
          : 'Shoppers are asked to rate their shopping experience right after ordering. Only you see these.'}
      </p>
      {latest.length > 0 && (
        <ul className="grid gap-2">
          {latest.map((f) => (
            <li key={f.number} className="rounded-card border border-line bg-surface p-4 text-sm">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lime" aria-label={`${f.rating} out of 5 stars`}>
                  {'★'.repeat(f.rating)}
                  <span className="text-line-2">{'★'.repeat(5 - f.rating)}</span>
                </span>
                <a href={`/admin/orders/${f.number}`} className="font-semibold hover:text-lime">
                  {f.number}
                </a>
                <span className="text-muted">
                  {f.name} · {formatDate(f.createdAt)}
                </span>
              </p>
              {f.comment && <p className="mt-1.5 whitespace-pre-line">{f.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminReviewsPage(props: PageProps<'/admin/reviews'>) {
  return (
    <>
      <AdminHeader title="Reviews" subtitle="From buyers of delivered orders. Approved reviews appear on product pages, with the average rating." />
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <Reviews searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
