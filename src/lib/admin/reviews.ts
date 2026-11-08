import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { reviewPhotos, type ReviewPhoto } from '@/lib/reviews';
import { deleteUpload } from '@/lib/uploads';

export const REVIEW_TABS = ['pending', 'approved', 'rejected'] as const;
export type ReviewTab = (typeof REVIEW_TABS)[number];
export const REVIEWS_PER_PAGE = 20;

export interface AdminReview {
  id: number;
  rating: number;
  body: string;
  name: string;
  photos: ReviewPhoto[];
  status: s.ReviewStatus;
  createdAt: number;
  productName: string;
  productSlug: string;
  orderNumber: string;
  email: string;
}

export async function reviewCounts(): Promise<Record<ReviewTab, number>> {
  const rows = await db.select({ status: s.reviews.status, n: sql<number>`count(*)` }).from(s.reviews).groupBy(s.reviews.status);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) counts[r.status] = r.n;
  return counts;
}

export async function listReviews(tab: ReviewTab, page: number): Promise<{ rows: AdminReview[]; total: number }> {
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({
        id: s.reviews.id,
        rating: s.reviews.rating,
        body: s.reviews.body,
        name: s.reviews.name,
        photos: s.reviews.photos,
        status: s.reviews.status,
        createdAt: s.reviews.createdAt,
        productName: s.products.name,
        productSlug: s.products.slug,
        orderNumber: s.orders.number,
        email: s.orders.email,
      })
      .from(s.reviews)
      .innerJoin(s.products, eq(s.products.id, s.reviews.productId))
      .innerJoin(s.orders, eq(s.orders.id, s.reviews.orderId))
      .where(eq(s.reviews.status, tab))
      // Oldest pending first, so nothing waits too long; newest first otherwise.
      .orderBy(tab === 'pending' ? s.reviews.createdAt : desc(s.reviews.createdAt))
      .limit(REVIEWS_PER_PAGE)
      .offset((Math.max(1, page) - 1) * REVIEWS_PER_PAGE),
    db.select({ n: sql<number>`count(*)` }).from(s.reviews).where(eq(s.reviews.status, tab)),
  ]);
  return { total: n, rows: rows.map((r) => ({ ...r, photos: reviewPhotos(r.photos) })) };
}

export async function setReviewStatus(id: number, status: 'approved' | 'rejected'): Promise<{ ok: true } | { ok: false; error: string }> {
  const done = await db.update(s.reviews).set({ status }).where(eq(s.reviews.id, id)).returning({ id: s.reviews.id });
  return done.length ? { ok: true } : { ok: false, error: 'This review was deleted.' };
}

/** Delete a review and its photos. The buyer can't review that item again. */
export async function deleteReview(id: number): Promise<{ ok: true }> {
  const review = await db.query.reviews.findFirst({ where: eq(s.reviews.id, id) });
  if (!review) return { ok: true };
  await db.delete(s.reviews).where(eq(s.reviews.id, id));
  if (review.photos.length) {
    const uploads = await db.select().from(s.uploads).where(and(inArray(s.uploads.id, review.photos), eq(s.uploads.kind, 'review')));
    for (const u of uploads) await deleteUpload(u);
  }
  return { ok: true };
}
