import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { countCouponUse, CouponUsedUpError } from '@/lib/coupons';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { sendMailSafely } from '@/lib/email/send';
import { orderConfirmationEmail, ownerOrderEmail } from '@/lib/email/templates';
import type { AddressInput, ContactInput } from '@/lib/india';
import type { PricedCart } from '@/lib/pricing/price-cart';
import { getSettings } from '@/lib/catalog/queries';
import { siteUrl } from '@/lib/site';
import { studioForType } from '@/lib/custom/studios';
import type { CustomDesign } from '@/lib/custom/types';
import { toUploadInfo } from '@/lib/uploads';
import type { Viewer } from '@/lib/viewer';
import { newAccessKey, newOrderNumber } from './numbers';
import type { OrderItemView, OrderStatus, OrderView, PaymentMethod } from './types';

type OrderRow = typeof s.orders.$inferSelect;
const now = () => Math.floor(Date.now() / 1000);

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function loadView(row: OrderRow): Promise<OrderView> {
  const [items, events] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, row.id)).orderBy(s.orderItems.id),
    db.select().from(s.orderEvents).where(eq(s.orderEvents.orderId, row.id)).orderBy(s.orderEvents.id),
  ]);
  return {
    id: row.id,
    number: row.number,
    accessKey: row.accessKey,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    email: row.email,
    phone: row.phone,
    name: row.name,
    address: row.address,
    items: items.map(({ orderId: _o, ...i }): OrderItemView => i),
    itemCount: row.itemCount,
    subtotal: row.subtotal,
    discounts: row.discounts,
    discountTotal: row.discountTotal,
    shipping: row.shipping,
    codFee: row.codFee,
    platformFee: row.platformFee,
    prepaidDiscount: row.prepaidDiscount,
    total: row.total,
    events: events.map((e) => ({ status: e.status, note: e.note, at: e.createdAt })),
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    shipment: shipmentOf(row),
    couponCode: row.couponCode,
  };
}

export const shipmentOf = (row: Pick<OrderRow, 'courier' | 'trackingNumber' | 'trackingUrl'>): OrderView['shipment'] =>
  row.courier && row.trackingNumber ? { courier: row.courier, trackingNumber: row.trackingNumber, trackingUrl: row.trackingUrl } : null;

/** The full order, for the admin panel (no access check: callers must check). */
export async function getOrderViewForAdmin(number: string): Promise<{ order: OrderView; row: OrderRow } | null> {
  const row = await getOrderRow(number);
  return row ? { order: await loadView(row), row } : null;
}

export const orderLink = (o: Pick<OrderView, 'number' | 'accessKey'>) => `${siteUrl()}/order/${o.number}?key=${o.accessKey}`;

/** Email the shopper and the store owner about a new (or newly paid) order. */
export async function sendOrderEmails(orderId: number): Promise<void> {
  const row = await db.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!row) return;
  const order = await loadView(row);
  const settings = await getSettings();
  const owner = process.env.ORDER_ALERT_EMAIL || settings.contact.email;
  await sendMailSafely({ to: order.email, ...orderConfirmationEmail(order, orderLink(order)) });
  if (owner) await sendMailSafely({ to: owner, ...ownerOrderEmail(order, orderLink(order)) });
}

export interface NewOrder {
  priced: PricedCart;
  payment: PaymentMethod;
  contact: ContactInput;
  address: AddressInput;
  idempotencyKey: string;
  userId: string | null;
}

export { CouponUsedUpError };

/**
 * Create an order with its items and first timeline event, and link any
 * custom-studio uploads to it. The same idempotency key always returns the
 * same order, so a double click can't create two.
 */
export async function createOrder(input: NewOrder): Promise<{ order: OrderRow; existing: boolean }> {
  const existing = await db.query.orders.findFirst({ where: eq(s.orders.idempotencyKey, input.idempotencyKey) });
  if (existing) return { order: existing, existing: true };

  const { priced, payment, contact, address } = input;
  const cod = payment === 'cod';
  const couponCode = priced.summary.coupon?.applied ? priced.summary.coupon.code : null;
  const status: OrderStatus = cod ? 'placed' : 'pending_payment';
  const t = now();
  const uploadIds = priced.lines.flatMap((l) => l.custom?.items.map((i) => i.id) ?? []);
  // Keep the full design on the order item: file names and sizes for the printer, plus captions and crops.
  const uploadRows = uploadIds.length ? await db.select().from(s.uploads).where(inArray(s.uploads.id, uploadIds)) : [];
  const uploadById = new Map(uploadRows.map((r) => [r.id, toUploadInfo(r)]));
  const designFor = (l: PricedCart['lines'][number]): CustomDesign | null => {
    const kind = studioForType(l.typeId)?.kind;
    if (!l.custom || !kind) return null;
    return {
      kind,
      items: l.custom.items.flatMap((i) => {
        const upload = uploadById.get(i.id);
        return upload ? [{ upload, ...(i.caption ? { caption: i.caption } : {}), ...(i.crop ? { crop: i.crop } : {}) }] : [];
      }),
      ...(l.custom.note ? { note: l.custom.note } : {}),
    };
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const order = await db.transaction(async (tx) => {
        const [o] = await tx
          .insert(s.orders)
          .values({
            number: newOrderNumber(),
            accessKey: newAccessKey(),
            userId: input.userId,
            email: contact.email,
            phone: contact.phone,
            name: address.name,
            address: { ...address, phone: contact.phone },
            status,
            paymentMethod: payment,
            paymentStatus: cod ? 'cod_due' : 'unpaid',
            itemCount: priced.summary.itemCount,
            subtotal: priced.summary.subtotal,
            discounts: priced.summary.discounts,
            discountTotal: priced.summary.discountTotal,
            shipping: priced.summary.shipping,
            codFee: priced.summary.codFee,
            platformFee: priced.summary.platformFee,
            prepaidDiscount: priced.summary.prepaidDiscount,
            total: priced.summary.total,
            couponCode,
            idempotencyKey: input.idempotencyKey,
            createdAt: t,
            updatedAt: t,
          })
          .returning();
        await tx.insert(s.orderItems).values(
          priced.lines.map((l) => ({
            orderId: o.id,
            productId: l.productId,
            typeId: l.typeId,
            slug: l.slug,
            name: l.name,
            typeName: l.typeName,
            options: l.options,
            optionLabels: l.optionLabels,
            art: l.art,
            image: l.image,
            custom: designFor(l),
            unit: l.unit,
            qty: l.qty,
            total: l.total,
          })),
        );
        await tx.insert(s.orderEvents).values({ orderId: o.id, status, note: cod ? 'Cash on Delivery' : 'Waiting for online payment', createdAt: t });
        // A COD order uses its coupon now (online orders when they're paid). Refuses if the last use just went.
        if (couponCode && cod) await countCouponUse(tx, couponCode, true);
        if (uploadIds.length) await tx.update(s.uploads).set({ orderId: o.id }).where(and(inArray(s.uploads.id, uploadIds), isNull(s.uploads.orderId)));
        return o;
      });
      return { order, existing: false };
    } catch (err) {
      const msg = String((err as Error).message);
      if (msg.includes('orders.idempotency_key')) {
        const again = await db.query.orders.findFirst({ where: eq(s.orders.idempotencyKey, input.idempotencyKey) });
        if (again) return { order: again, existing: true };
      }
      if (!msg.includes('orders.number')) throw err;
      // Order number collision (very rare): try another.
    }
  }
  throw new Error('Could not create the order. Please try again.');
}

export async function setRazorpayOrder(orderId: number, razorpayOrderId: string): Promise<void> {
  await db.update(s.orders).set({ razorpayOrderId, updatedAt: now() }).where(eq(s.orders.id, orderId));
}

export async function getOrderRow(number: string): Promise<OrderRow | null> {
  return (await db.query.orders.findFirst({ where: eq(s.orders.number, number) })) ?? null;
}

export async function findByRazorpayOrder(razorpayOrderId: string): Promise<OrderRow | null> {
  return (await db.query.orders.findFirst({ where: eq(s.orders.razorpayOrderId, razorpayOrderId) })) ?? null;
}

/** The order with this number and private key. */
export async function getOrderWithKey(number: string, key: string): Promise<OrderRow | null> {
  const row = await getOrderRow(number);
  return row && key && sameSecret(key, row.accessKey) ? row : null;
}

/** An order the visitor may see: they have its private key, own it, or are signed in with its email. */
export async function getOrderForViewer(number: string, opts: { key?: string | null; viewer: Viewer | null }): Promise<OrderView | null> {
  const row = await getOrderRow(number);
  if (!row) return null;
  const v = opts.viewer;
  const allowed = (opts.key && sameSecret(opts.key, row.accessKey)) || (v && (row.userId === v.id || (v.emailVerified && v.email === row.email)));
  return allowed ? loadView(row) : null;
}

/**
 * Mark an online order as paid (from the payment confirmation, the webhook or
 * the test gateway). Only the first call changes anything.
 */
export async function markPaid(orderId: number, opts: { paymentId: string; via: string }): Promise<boolean> {
  const t = now();
  const changed = await db
    .update(s.orders)
    .set({ status: 'placed', paymentStatus: 'paid', razorpayPaymentId: opts.paymentId, paidAt: t, updatedAt: t })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.paymentMethod, 'online'), inArray(s.orders.paymentStatus, ['unpaid', 'failed']), inArray(s.orders.status, ['pending_payment', 'cancelled'])))
    .returning({ id: s.orders.id, couponCode: s.orders.couponCode });
  if (!changed.length) return false;
  // The shopper has paid, so the coupon counts even if its limit was reached meanwhile.
  if (changed[0].couponCode) await countCouponUse(db, changed[0].couponCode, false);
  await db.insert(s.orderEvents).values({ orderId, status: 'placed', note: `Payment received (${opts.via})`, createdAt: t });
  return true;
}

export async function markPaymentFailed(orderId: number, reason: string): Promise<void> {
  const t = now();
  const changed = await db
    .update(s.orders)
    .set({ paymentStatus: 'failed', updatedAt: t })
    .where(and(eq(s.orders.id, orderId), eq(s.orders.status, 'pending_payment'), eq(s.orders.paymentStatus, 'unpaid')))
    .returning({ id: s.orders.id });
  if (changed.length) await db.insert(s.orderEvents).values({ orderId, status: 'pending_payment', note: `Payment failed: ${reason.slice(0, 200)}`, createdAt: t });
}

/** What the tracking page shows: status and items, but not the address or contact details. */
export interface TrackedOrder {
  number: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderView['paymentStatus'];
  createdAt: number;
  total: number;
  itemCount: number;
  items: Array<Pick<OrderItemView, 'name' | 'typeName' | 'qty' | 'art' | 'image' | 'optionLabels'>>;
  events: OrderView['events'];
  city: string;
  shipment: OrderView['shipment'];
}

export async function findForTracking(number: string, phone: string): Promise<TrackedOrder | null> {
  const row = await getOrderRow(number);
  if (!row || !sameSecret(phone, row.phone)) return null;
  const view = await loadView(row);
  return {
    number: view.number,
    status: view.status,
    paymentMethod: view.paymentMethod,
    paymentStatus: view.paymentStatus,
    createdAt: view.createdAt,
    total: view.total,
    itemCount: view.itemCount,
    items: view.items.map(({ name, typeName, qty, art, image, optionLabels }) => ({ name, typeName, qty, art, image, optionLabels })),
    events: view.events,
    city: view.address.city,
    shipment: view.shipment,
  };
}

export interface OrderSummary {
  number: string;
  status: OrderStatus;
  paymentStatus: OrderView['paymentStatus'];
  createdAt: number;
  total: number;
  itemCount: number;
  thumbs: Array<Pick<OrderItemView, 'art' | 'image' | 'name'>>;
}

/** Orders for the account page: the shopper's own, plus earlier guest orders placed with their verified email. */
export async function listOrdersForViewer(v: Viewer): Promise<OrderSummary[]> {
  const mine = v.emailVerified ? or(eq(s.orders.userId, v.id), eq(s.orders.email, v.email)) : eq(s.orders.userId, v.id);
  const rows = await db.select().from(s.orders).where(mine).orderBy(desc(s.orders.createdAt)).limit(50);
  if (!rows.length) return [];
  const items = await db
    .select({ orderId: s.orderItems.orderId, art: s.orderItems.art, image: s.orderItems.image, name: s.orderItems.name })
    .from(s.orderItems)
    .where(inArray(s.orderItems.orderId, rows.map((r) => r.id)))
    .orderBy(s.orderItems.id);
  return rows.map((r) => ({
    number: r.number,
    status: r.status,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt,
    total: r.total,
    itemCount: r.itemCount,
    thumbs: items.filter((i) => i.orderId === r.id).slice(0, 4).map(({ art, image, name }) => ({ art, image, name })),
  }));
}

/** Cancel online orders that were never paid. Returns how many were cancelled. */
export async function cancelUnpaidOrders(olderThanSec: number): Promise<number> {
  const t = now();
  const rows = await db
    .update(s.orders)
    .set({ status: 'cancelled', updatedAt: t })
    .where(and(eq(s.orders.status, 'pending_payment'), sql`${s.orders.createdAt} < ${t - olderThanSec}`))
    .returning({ id: s.orders.id });
  if (rows.length) await db.insert(s.orderEvents).values(rows.map((r) => ({ orderId: r.id, status: 'cancelled' as const, note: 'Not paid within 24 hours', createdAt: t })));
  return rows.length;
}
