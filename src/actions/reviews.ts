'use server';

import { z } from 'zod';
import { normalizeOrderNumber } from '@/lib/orders/numbers';
import { getOrderForViewer } from '@/lib/orders/service';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { submitReview, type ReviewResult } from '@/lib/reviews';
import { getViewer } from '@/lib/viewer';

const Input = z.object({
  number: z.string().max(20),
  key: z.string().max(64).nullable(),
  itemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000),
  photos: z.array(z.string().max(40)).max(3),
});

/** A buyer reviews an item from their delivered order. Reviews wait for an admin to approve them. */
export async function submitReviewAction(raw: unknown): Promise<ReviewResult> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Choose a star rating, and keep the review under 1,000 characters.' };
  const limit = await rateLimit(`review:${await clientIp()}`, 20, 3600);
  if (!limit.ok) return { ok: false, error: 'That’s a lot of reviews in a short time. Please try again later.' };
  const number = normalizeOrderNumber(p.data.number);
  const order = number ? await getOrderForViewer(number, { key: p.data.key, viewer: await getViewer() }) : null;
  if (!order) return { ok: false, error: 'We couldn’t find that order. Open it from your email or your account and try again.' };
  // A new review waits for approval, so product pages don't change yet.
  return submitReview(order, p.data);
}
