'use server';

import { z } from 'zod';
import { normalizeOrderNumber } from '@/lib/orders/numbers';
import { getOrderForViewer } from '@/lib/orders/service';
import { cancelByShopper, MAX_FEEDBACK_TEXT, saveFeedback, type ShopperResult } from '@/lib/orders/shopper';
import type { OrderView } from '@/lib/orders/types';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getViewer } from '@/lib/viewer';

const Order = { number: z.string().max(20), key: z.string().max(64).nullable() };
const NOT_FOUND = 'We couldn’t find that order. Open it from your order link or Track order and try again.';

/** The order, if this visitor may change it: they have its private link, or it's in their account. */
async function findOrder(number: string, key: string | null): Promise<OrderView | null> {
  const n = normalizeOrderNumber(number);
  return n ? getOrderForViewer(n, { key, viewer: await getViewer() }) : null;
}

const Cancel = z.object({ ...Order, reason: z.string().max(40), other: z.string().max(400) });

/** A shopper cancels their own order before printing starts, saying why. */
export async function cancelMyOrderAction(raw: unknown): Promise<ShopperResult> {
  const p = Cancel.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Choose why you’re cancelling, and keep it under 200 characters.' };
  const limit = await rateLimit(`cancel:${await clientIp()}`, 10, 3600);
  if (!limit.ok) return { ok: false, error: 'Too many tries. Please message us on WhatsApp instead.' };
  const order = await findOrder(p.data.number, p.data.key);
  if (!order) return { ok: false, error: NOT_FOUND };
  return cancelByShopper(order, p.data.reason, p.data.other);
}

const Rate = z.object({ ...Order, rating: z.number().int().min(1).max(5), comment: z.string().max(MAX_FEEDBACK_TEXT * 2) });

/** A shopper says how shopping went, right after ordering. */
export async function submitFeedbackAction(raw: unknown): Promise<ShopperResult> {
  const p = Rate.safeParse(raw);
  if (!p.success) return { ok: false, error: `Choose from 1 to 5 stars, and keep the comment under ${MAX_FEEDBACK_TEXT} characters.` };
  const limit = await rateLimit(`feedback:${await clientIp()}`, 20, 3600);
  if (!limit.ok) return { ok: false, error: 'Too many tries. Please try again later.' };
  const order = await findOrder(p.data.number, p.data.key);
  if (!order) return { ok: false, error: NOT_FOUND };
  return saveFeedback(order, p.data.rating, p.data.comment);
}
