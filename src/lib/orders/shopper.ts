import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { after } from 'next/server';
import { cancelOrderRow } from '@/lib/admin/orders';
import { getSettings } from '@/lib/catalog/queries';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { sendMailSafely } from '@/lib/email/send';
import { ownerCancelledEmail } from '@/lib/email/templates';
import { siteUrl } from '@/lib/site';
import { cancelReasonText, SHOPPER_CANCELLABLE } from './status';
import type { OrderView } from './types';

/**
 * What a shopper can do on their own order page, besides reviewing delivered items:
 * cancel it (with a reason) until printing starts, and say how shopping went.
 */

export type ShopperResult = { ok: true } | { ok: false; error: string };

export async function cancelByShopper(order: OrderView, reasonId: string, other: string): Promise<ShopperResult> {
  const reason = cancelReasonText(reasonId, other);
  if (!reason) return { ok: false, error: reasonId === 'other' ? 'Tell us in a few words why you’re cancelling.' : 'Choose why you’re cancelling.' };
  if (!SHOPPER_CANCELLABLE.includes(order.status)) {
    return { ok: false, error: 'This order is already being printed, so it can’t be cancelled here. Message us on WhatsApp and we’ll help.' };
  }
  const row = await db.query.orders.findFirst({ where: eq(s.orders.id, order.id) });
  if (!row) return { ok: false, error: 'We couldn’t find that order.' };
  const r = await cancelOrderRow(row, reason, `Cancelled by the customer: ${reason}`);
  if (!r.ok) return { ok: false, error: 'This order just changed. Refresh the page to see where it is now.' };
  if (row.status !== 'pending_payment') {
    after(async () => {
      const owner = process.env.ORDER_ALERT_EMAIL || (await getSettings()).contact.email;
      if (owner) await sendMailSafely({ to: owner, ...ownerCancelledEmail(order, reason, `${siteUrl()}/admin/orders/${order.number}`) });
    });
  }
  return { ok: true };
}

export const MAX_FEEDBACK_TEXT = 500;

/** Statuses where the order page asks how shopping went: once it's placed, and not after it's cancelled. */
export const FEEDBACK_STATUSES: readonly OrderView['status'][] = ['placed', 'confirmed', 'printing', 'shipped', 'delivered'];

export interface Feedback {
  rating: number;
  comment: string;
  createdAt: number;
}

export async function feedbackFor(orderId: number): Promise<Feedback | null> {
  const row = await db.query.orderFeedback.findFirst({ where: eq(s.orderFeedback.orderId, orderId) });
  return row ? { rating: row.rating, comment: row.comment, createdAt: row.createdAt } : null;
}

export async function saveFeedback(order: OrderView, rating: number, comment: string): Promise<ShopperResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: 'Choose from 1 to 5 stars.' };
  if (!FEEDBACK_STATUSES.includes(order.status)) return { ok: false, error: 'This order can’t be rated.' };
  const text = comment.trim().slice(0, MAX_FEEDBACK_TEXT);
  const saved = await db
    .insert(s.orderFeedback)
    .values({ orderId: order.id, rating, comment: text, createdAt: Math.floor(Date.now() / 1000) })
    .onConflictDoNothing()
    .returning({ id: s.orderFeedback.id });
  // One per order: a second try (another tab) keeps the first answer.
  return saved.length ? { ok: true } : { ok: false, error: 'You’ve already told us how it went. Thank you!' };
}

export interface FeedbackRow extends Feedback {
  number: string;
  name: string;
}

/** The latest shopping-experience ratings, and the average of all of them, for the admin. */
export async function feedbackSummary(limit = 20): Promise<{ count: number; average: number | null; latest: FeedbackRow[] }> {
  const [totals] = await db.select({ count: sql<number>`count(*)`, average: sql<number | null>`avg(${s.orderFeedback.rating})` }).from(s.orderFeedback);
  const latest = await db
    .select({ rating: s.orderFeedback.rating, comment: s.orderFeedback.comment, createdAt: s.orderFeedback.createdAt, number: s.orders.number, name: s.orders.name })
    .from(s.orderFeedback)
    .innerJoin(s.orders, eq(s.orders.id, s.orderFeedback.orderId))
    .orderBy(desc(s.orderFeedback.createdAt))
    .limit(limit);
  return { count: Number(totals?.count ?? 0), average: totals?.average == null ? null : Number(totals.average), latest };
}
