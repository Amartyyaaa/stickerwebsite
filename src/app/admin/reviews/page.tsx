import { Suspense } from 'react';
import { ReviewCard } from '@/components/admin/review-card';
import { AdminHeader, Pager, Tabs } from '@/components/admin/ui';
import { adminOrNull } from '@/lib/admin/guard';
import { listReviews, REVIEW_TABS, reviewCounts, REVIEWS_PER_PAGE, type ReviewTab } from '@/lib/admin/reviews';
import { buildQuery } from '@/lib/catalog/filters';

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
    </>
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
