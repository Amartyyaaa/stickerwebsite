import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { cacheLife, cacheTag } from 'next/cache';
import { uploadSrc } from '@/lib/custom/types';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import type { OrderView } from '@/lib/orders/types';
import { MAX_REVIEW_PHOTOS, ratingSummary, reviewName, reviewProblem, type RatingSummary } from '@/lib/review-rules';
import { isUploadId } from '@/lib/uploads';

/** Verified-buyer reviews: written from a delivered order's page, shown on product pages once approved. */

export interface ReviewPhoto {
  src: string;
  thumb: string;
}

export interface ReviewView {
  id: number;
  rating: number;
  body: string;
  name: string;
  photos: ReviewPhoto[];
  createdAt: number;
}

export const reviewPhotos = (ids: string[]): ReviewPhoto[] => ids.map((id) => ({ src: uploadSrc(id), thumb: uploadSrc(id, 'thumb') }));

/** Approved reviews for a product page (newest first) and their summary. Cached until a review is approved or removed. */
export async function getProductReviews(productId: number): Promise<{ summary: RatingSummary; reviews: ReviewView[] }> {
  'use cache';
  cacheLife('hours');
  cacheTag('reviews');
  const rows = await db
    .select()
    .from(s.reviews)
    .where(and(eq(s.reviews.productId, productId), eq(s.reviews.status, 'approved')))
    .orderBy(desc(s.reviews.createdAt), desc(s.reviews.id));
  return {
    summary: ratingSummary(rows.map((r) => r.rating)),
    reviews: rows.slice(0, 30).map((r) => ({ id: r.id, rating: r.rating, body: r.body, name: r.name, photos: reviewPhotos(r.photos), createdAt: r.createdAt })),
  };
}

export type ItemReviewState = 'pending' | 'approved' | 'rejected';

/** Which items of an order already have a review. */
export async function reviewStates(orderId: number): Promise<Record<number, ItemReviewState>> {
  const rows = await db.select({ itemId: s.reviews.orderItemId, status: s.reviews.status }).from(s.reviews).where(eq(s.reviews.orderId, orderId));
  return Object.fromEntries(rows.map((r) => [r.itemId, r.status]));
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

/** Save a review for one item of a delivered order the shopper can see. Photos are the shopper's own uploads. */
export async function submitReview(order: OrderView, input: { itemId: number; rating: number; body: string; photos: string[] }): Promise<ReviewResult> {
  const item = order.items.find((i) => i.id === input.itemId);
  if (!item) return { ok: false, error: 'That item isn’t in this order.' };
  const photoIds = [...new Set(input.photos)].filter(isUploadId);
  const [product, existing, photoRows] = await Promise.all([
    item.productId > 0 ? db.query.products.findFirst({ columns: { id: true }, where: eq(s.products.id, item.productId) }) : null,
    db.query.reviews.findFirst({ columns: { id: true }, where: eq(s.reviews.orderItemId, item.id) }),
    photoIds.length
      ? db
          .select({ id: s.uploads.id })
          .from(s.uploads)
          .where(and(inArray(s.uploads.id, photoIds), eq(s.uploads.status, 'ready'), eq(s.uploads.kind, 'custom')))
      : [],
  ]);
  const problem = reviewProblem({
    delivered: order.status === 'delivered',
    productId: item.productId,
    productExists: Boolean(product),
    alreadyReviewed: Boolean(existing),
    rating: input.rating,
    body: input.body,
    photos: photoIds.length,
  });
  if (problem) return { ok: false, error: problem };
  if (photoRows.length !== photoIds.length || photoIds.length > MAX_REVIEW_PHOTOS) return { ok: false, error: 'A photo is missing. Remove it and add it again.' };

  try {
    await db.transaction(async (tx) => {
      await tx.insert(s.reviews).values({
        productId: item.productId,
        orderId: order.id,
        orderItemId: item.id,
        rating: input.rating,
        body: input.body.trim(),
        name: reviewName(order.name),
        photos: photoIds,
        status: 'pending',
        createdAt: Math.floor(Date.now() / 1000),
      });
      // Review photos are kept with the review, so the daily cleanup of unused uploads leaves them alone.
      if (photoIds.length) await tx.update(s.uploads).set({ kind: 'review' }).where(inArray(s.uploads.id, photoIds));
    });
  } catch (err) {
    if (String((err as Error).message).includes('reviews.order_item_id')) return { ok: false, error: 'You’ve already reviewed this item. Thank you!' };
    throw err;
  }
  return { ok: true };
}
