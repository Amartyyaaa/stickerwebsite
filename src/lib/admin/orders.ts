import 'server-only';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import { after } from 'next/server';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { sendMailSafely } from '@/lib/email/send';
import { orderStatusEmail, type StatusEmail } from '@/lib/email/templates';
import { refundable } from '@/lib/orders/refunds';
import { getOrderViewForAdmin, orderLink } from '@/lib/orders/service';
import { canMove, STATUS_LABEL } from '@/lib/orders/status';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/orders/types';
import { createRazorpayRefund, paymentsMode } from '@/lib/payments/razorpay';
import { formatINR } from '@/lib/money';
import type { Viewer } from '@/lib/viewer';

/**
 * What the admin panel does with orders: list and search them, move them
 * through their statuses, ship, cancel and refund. Every change adds a
 * timeline event that names the admin who made it.
 */

type OrderRow = typeof s.orders.$inferSelect;
export type Result = { ok: true } | { ok: false; error: string };
const now = () => Math.floor(Date.now() / 1000);

export const ORDER_TABS = ['all', 'to_confirm', 'to_print', 'printing', 'shipped', 'delivered', 'unpaid', 'closed'] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const TAB_LABEL: Record<OrderTab, string> = {
  all: 'All',
  to_confirm: 'To confirm (COD)',
  to_print: 'To print',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  unpaid: 'Unpaid',
  closed: 'Cancelled',
};

const TAB_WHERE: Record<OrderTab, SQL> = {
  all: sql`1 = 1`,
  to_confirm: sql`o.status = 'placed' AND o.payment_method = 'cod'`,
  to_print: sql`((o.status = 'placed' AND o.payment_method = 'online') OR o.status = 'confirmed')`,
  printing: sql`o.status = 'printing'`,
  shipped: sql`o.status = 'shipped'`,
  delivered: sql`o.status = 'delivered'`,
  unpaid: sql`o.status = 'pending_payment'`,
  closed: sql`o.status IN ('cancelled', 'refunded')`,
};

export interface AdminOrderRow {
  number: string;
  createdAt: number;
  name: string;
  email: string;
  phone: string;
  itemCount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  hasCustom: boolean;
}

export const PER_PAGE = 30;

export async function listOrders(f: { tab: OrderTab; payment?: PaymentMethod; q?: string; page: number }): Promise<{ rows: AdminOrderRow[]; total: number }> {
  const where: SQL[] = [TAB_WHERE[f.tab]];
  if (f.payment) where.push(sql`o.payment_method = ${f.payment}`);
  const q = f.q?.trim();
  if (q) {
    const like = `%${q.toLowerCase().replace(/[%_]/g, '')}%`;
    const digits = q.replace(/\D/g, '');
    where.push(
      sql`(lower(o.number) LIKE ${like} OR lower(o.email) LIKE ${like} OR lower(o.name) LIKE ${like}${digits.length >= 4 ? sql` OR o.phone LIKE ${`%${digits.slice(-10)}%`}` : sql``})`,
    );
  }
  const w = sql.join(where, sql` AND `);
  const page = Math.max(1, f.page);
  const [rows, [{ n }]] = await Promise.all([
    db.all<{
      number: string;
      created_at: number;
      name: string;
      email: string;
      phone: string;
      item_count: number;
      total: number;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      status: OrderStatus;
      has_custom: number;
    }>(sql`
      SELECT o.number, o.created_at, o.name, o.email, o.phone, o.item_count, o.total, o.payment_method, o.payment_status, o.status,
        EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.custom IS NOT NULL) AS has_custom
      FROM orders o WHERE ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ${PER_PAGE} OFFSET ${(page - 1) * PER_PAGE}`),
    db.all<{ n: number }>(sql`SELECT count(*) AS n FROM orders o WHERE ${w}`),
  ]);
  return {
    total: n,
    rows: rows.map((r) => ({
      number: r.number,
      createdAt: r.created_at,
      name: r.name,
      email: r.email,
      phone: r.phone,
      itemCount: r.item_count,
      total: r.total,
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      status: r.status,
      hasCustom: Boolean(r.has_custom),
    })),
  };
}

/** How many orders are in each tab, for the tab badges. */
export async function tabCounts(): Promise<Record<OrderTab, number>> {
  // Quoted aliases: "all" is an SQL keyword.
  const parts = ORDER_TABS.map((t) => sql`SUM(CASE WHEN ${TAB_WHERE[t]} THEN 1 ELSE 0 END) AS ${sql.raw(`"${t}"`)}`);
  const [row] = await db.all<Record<OrderTab, number | null>>(sql`SELECT ${sql.join(parts, sql`, `)} FROM orders o`);
  return Object.fromEntries(ORDER_TABS.map((t) => [t, row?.[t] ?? 0])) as Record<OrderTab, number>;
}

const IST = 19800;
/** Start of today in India, as a Unix time. */
export const startOfTodayIST = (t = now()) => Math.floor((t + IST) / 86400) * 86400 - IST;

export interface Dashboard {
  today: { orders: number; revenue: number };
  week: Array<{ day: number; orders: number; revenue: number }>;
  attention: { toConfirm: number; toPrint: number; custom: number; unpaid: number };
  recent: AdminOrderRow[];
}

const COUNTED = sql`o.status NOT IN ('pending_payment', 'cancelled')`;

export async function dashboard(): Promise<Dashboard> {
  const today = startOfTodayIST();
  const weekStart = today - 6 * 86400;
  const [[t], days, [a], recent] = await Promise.all([
    db.all<{ n: number; rev: number | null }>(sql`SELECT count(*) AS n, sum(o.total) AS rev FROM orders o WHERE o.created_at >= ${today} AND ${COUNTED}`),
    db.all<{ day: number; n: number; rev: number }>(sql`
      SELECT ((o.created_at + ${IST}) / 86400) * 86400 - ${IST} AS day, count(*) AS n, sum(o.total) AS rev
      FROM orders o WHERE o.created_at >= ${weekStart} AND ${COUNTED} GROUP BY day`),
    db.all<{ to_confirm: number | null; to_print: number | null; custom: number | null; unpaid: number | null }>(sql`
      SELECT SUM(CASE WHEN ${TAB_WHERE.to_confirm} THEN 1 ELSE 0 END) AS to_confirm,
        SUM(CASE WHEN ${TAB_WHERE.to_print} THEN 1 ELSE 0 END) AS to_print,
        SUM(CASE WHEN o.status IN ('placed', 'confirmed', 'printing') AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.custom IS NOT NULL) THEN 1 ELSE 0 END) AS custom,
        SUM(CASE WHEN ${TAB_WHERE.unpaid} THEN 1 ELSE 0 END) AS unpaid
      FROM orders o`),
    listOrders({ tab: 'all', page: 1 }),
  ]);
  const byDay = new Map(days.map((d) => [d.day, d]));
  return {
    today: { orders: t?.n ?? 0, revenue: t?.rev ?? 0 },
    week: Array.from({ length: 7 }, (_, i) => {
      const day = weekStart + i * 86400;
      const d = byDay.get(day);
      return { day, orders: d?.n ?? 0, revenue: d?.rev ?? 0 };
    }),
    attention: { toConfirm: a?.to_confirm ?? 0, toPrint: a?.to_print ?? 0, custom: a?.custom ?? 0, unpaid: a?.unpaid ?? 0 },
    recent: recent.rows.slice(0, 8),
  };
}

async function rowById(id: number): Promise<OrderRow | null> {
  return (await db.query.orders.findFirst({ where: eq(s.orders.id, id) })) ?? null;
}

async function event(orderId: number, status: OrderStatus, note: string) {
  await db.insert(s.orderEvents).values({ orderId, status, note: note.slice(0, 300), createdAt: now() });
}

function email(orderNumber: string, kind: StatusEmail, extra?: { reason?: string; amount?: number }) {
  after(async () => {
    const found = await getOrderViewForAdmin(orderNumber);
    if (found) await sendMailSafely({ to: found.order.email, ...orderStatusEmail(kind, found.order, orderLink(found.order), extra) });
  });
}

const CHANGED = 'This order was just changed by someone else. Refresh the page and try again.';

/** Move an order to the next status, if that's an allowed move. */
export async function moveOrder(orderId: number, to: OrderStatus, admin: Viewer, note?: string): Promise<Result> {
  const row = await rowById(orderId);
  if (!row) return { ok: false, error: 'Order not found.' };
  if (to === 'shipped') return { ok: false, error: 'Use “Mark shipped” to add the courier and tracking number.' };
  if (to === 'cancelled') return { ok: false, error: 'Use “Cancel order” to give a reason.' };
  if (!canMove(row.status, to)) return { ok: false, error: `An order that is ${STATUS_LABEL[row.status].toLowerCase()} can’t be marked ${STATUS_LABEL[to].toLowerCase()}.` };
  const t = now();
  // Cash on Delivery is collected when the parcel is delivered.
  const collect = to === 'delivered' && row.paymentMethod === 'cod' && row.paymentStatus === 'cod_due';
  const changed = await db
    .update(s.orders)
    .set({ status: to, updatedAt: t, ...(collect ? { paymentStatus: 'paid' as const, paidAt: t } : {}) })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.status, row.status)))
    .returning({ id: s.orders.id });
  if (!changed.length) return { ok: false, error: CHANGED };
  await event(orderId, to, note ?? `By ${admin.email}${collect ? '. Cash collected' : ''}`);
  if (to === 'delivered') email(row.number, 'delivered');
  return { ok: true };
}

export async function shipOrder(orderId: number, ship: { courier: string; trackingNumber: string; trackingUrl: string | null }, admin: Viewer): Promise<Result> {
  const row = await rowById(orderId);
  if (!row) return { ok: false, error: 'Order not found.' };
  if (!canMove(row.status, 'shipped')) return { ok: false, error: 'Mark the order as printing before shipping it.' };
  const changed = await db
    .update(s.orders)
    .set({ status: 'shipped', courier: ship.courier, trackingNumber: ship.trackingNumber, trackingUrl: ship.trackingUrl, updatedAt: now() })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.status, row.status)))
    .returning({ id: s.orders.id });
  if (!changed.length) return { ok: false, error: CHANGED };
  await event(orderId, 'shipped', `${ship.courier} ${ship.trackingNumber}. By ${admin.email}`);
  email(row.number, 'shipped');
  return { ok: true };
}

export async function cancelOrder(orderId: number, reason: string, admin: Viewer): Promise<Result> {
  const row = await rowById(orderId);
  if (!row) return { ok: false, error: 'Order not found.' };
  if (!canMove(row.status, 'cancelled')) return { ok: false, error: 'Shipped or delivered orders can’t be cancelled. Refund them instead.' };
  const changed = await db
    .update(s.orders)
    .set({ status: 'cancelled', updatedAt: now() })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.status, row.status)))
    .returning({ id: s.orders.id });
  if (!changed.length) return { ok: false, error: CHANGED };
  await event(orderId, 'cancelled', `${reason}. By ${admin.email}`);
  if (row.status !== 'pending_payment') email(row.number, 'cancelled', { reason });
  return { ok: true };
}

/**
 * Refund money that was received: through Razorpay when the order was paid
 * online and keys are set, otherwise recorded as a manual refund.
 */
export async function refundOrder(orderId: number, amount: number, opts: { reference: string }, admin: Viewer): Promise<Result> {
  const row = await rowById(orderId);
  if (!row) return { ok: false, error: 'Order not found.' };
  const max = refundable(row);
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'Enter the amount to refund.' };
  if (amount > max) return { ok: false, error: `You can refund up to ${formatINR(max)} on this order.` };
  if (row.status !== 'cancelled' && row.status !== 'delivered' && row.status !== 'refunded') {
    return { ok: false, error: 'Cancel the order first, or wait until it’s delivered (for returns).' };
  }
  let via = opts.reference.trim() ? `Manual refund (${opts.reference.trim()})` : 'Manual refund';
  let refundId: string | null = row.razorpayRefundId;
  if (row.paymentMethod === 'online' && row.razorpayPaymentId && paymentsMode() === 'razorpay') {
    try {
      const r = await createRazorpayRefund(row.razorpayPaymentId, amount, { order: row.number });
      refundId = r.id;
      via = `Razorpay refund ${r.id}`;
    } catch (err) {
      return { ok: false, error: `Razorpay refused the refund: ${(err as Error).message.slice(0, 200)}` };
    }
  }
  const total = row.refundedAmount + amount;
  const full = total >= row.total;
  await db
    .update(s.orders)
    .set({
      refundedAmount: total,
      razorpayRefundId: refundId,
      updatedAt: now(),
      ...(full ? { paymentStatus: 'refunded' as const, status: 'refunded' as const } : {}),
    })
    .where(eq(s.orders.id, orderId));
  await event(orderId, full ? 'refunded' : row.status, `Refunded ${formatINR(amount)}: ${via}. By ${admin.email}`);
  email(row.number, 'refunded', { amount });
  return { ok: true };
}

export async function saveNote(orderId: number, note: string): Promise<Result> {
  await db.update(s.orders).set({ adminNote: note.slice(0, 2000), updatedAt: now() }).where(eq(s.orders.id, orderId));
  return { ok: true };
}
