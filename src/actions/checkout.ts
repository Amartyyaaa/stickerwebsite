'use server';

import { after } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { addresses } from '@/lib/db/schema';
import { AddressInput, ContactInput, fieldErrors } from '@/lib/india';
import type { ActionResult, PaymentStart, PlaceOrderResult } from '@/lib/orders/checkout-types';
import { codCheck } from '@/lib/orders/cod';
import { CouponUsedUpError, createOrder, getOrderWithKey, markPaid, markPaymentFailed, sendOrderEmails, setRazorpayOrder } from '@/lib/orders/service';
import { createRazorpayOrder, paymentsMode, razorpayKeyId, verifyRazorpayPayment } from '@/lib/payments/razorpay';
import { CartLinesInput, priceCart } from '@/lib/pricing/price-cart';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { getViewer } from '@/lib/viewer';

const PlaceOrderInput = z.object({
  lines: CartLinesInput.min(1, 'Your cart is empty.'),
  payment: z.enum(['online', 'cod']),
  contact: ContactInput,
  address: AddressInput.omit({ phone: true }),
  saveAddress: z.boolean().optional(),
  expectedTotal: z.number().int().nonnegative(),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  coupon: z.string().max(40).optional(),
});

type OrderRow = NonNullable<Awaited<ReturnType<typeof getOrderWithKey>>>;

/** Start (or restart) the online payment for an unpaid order. */
async function startPayment(order: OrderRow): Promise<PaymentStart> {
  const mode = paymentsMode();
  if (mode === 'mock') return { mode: 'mock', amount: order.total };
  if (mode !== 'razorpay') throw new Error('Online payment isn’t available right now. Please choose Cash on Delivery.');
  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const r = await createRazorpayOrder({ amount: order.total, receipt: order.number, notes: { order: order.number } });
    razorpayOrderId = r.id;
    await setRazorpayOrder(order.id, r.id);
  }
  return { mode: 'razorpay', keyId: razorpayKeyId(), razorpayOrderId, amount: order.total, prefill: { name: order.name, email: order.email, contact: order.phone } };
}

/**
 * Create the order from the shopper's cart. Prices are worked out again on the
 * server; if they no longer match what the shopper saw, nothing is created.
 */
export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please check the highlighted details.', fields: fieldErrors(parsed.error) };
  const input = parsed.data;

  const limit = await rateLimit(`checkout:${await clientIp()}`, 15, 600);
  if (!limit.ok) return { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' };
  if (input.payment === 'online' && paymentsMode() === 'off') return { ok: false, error: 'Online payment isn’t available right now. Please choose Cash on Delivery.' };

  const priced = await priceCart(input.lines, { payment: input.payment, coupon: input.coupon, email: input.contact.email });
  if (priced.invalid.length || !priced.lines.length) {
    return { ok: false, error: 'Some items in your cart are no longer available, so we’ve updated it. Please check and try again.', refresh: true };
  }
  const coupon = priced.summary.coupon;
  if (coupon && !coupon.applied) return { ok: false, error: coupon.reason ?? 'That coupon can’t be used.', refresh: true };
  if (input.payment === 'cod') {
    const before = priced.summary.total - priced.summary.codFee;
    const cod = codCheck(priced.settings, before, priced.lines.some((l) => l.custom), { online: paymentsMode() !== 'off' });
    if (!cod.ok) return { ok: false, error: cod.reason, refresh: true };
  }
  if (priced.summary.total !== input.expectedTotal) {
    return { ok: false, error: 'Prices changed since you opened checkout. Please check the new total and place your order again.', refresh: true };
  }

  const viewer = await getViewer();
  let created: Awaited<ReturnType<typeof createOrder>>;
  try {
    created = await createOrder({
      priced,
      payment: input.payment,
      contact: input.contact,
      address: { ...input.address, phone: input.contact.phone },
      idempotencyKey: input.idempotencyKey,
      userId: viewer?.id ?? null,
    });
  } catch (err) {
    if (err instanceof CouponUsedUpError) return { ok: false, error: err.message, refresh: true };
    throw err;
  }
  const { order, existing } = created;

  if (viewer && input.saveAddress && !existing) {
    const a = input.address;
    const same = await db.query.addresses.findFirst({
      where: and(eq(addresses.userId, viewer.id), eq(addresses.line1, a.line1), eq(addresses.pincode, a.pincode), eq(addresses.name, a.name)),
    });
    if (!same) {
      const hasAny = await db.query.addresses.findFirst({ where: eq(addresses.userId, viewer.id) });
      await db.insert(addresses).values({ userId: viewer.id, ...a, phone: input.contact.phone, isDefault: !hasAny, createdAt: Math.floor(Date.now() / 1000) });
    }
  }

  if (order.paymentMethod === 'cod') {
    if (!existing) after(() => sendOrderEmails(order.id));
    return { ok: true, number: order.number, key: order.accessKey, payment: { mode: 'cod' } };
  }
  try {
    return { ok: true, number: order.number, key: order.accessKey, payment: await startPayment(order) };
  } catch (err) {
    console.error('[checkout]', err);
    return { ok: false, error: 'We couldn’t start the payment. Please try again in a moment.' };
  }
}

const OrderRef = z.object({ number: z.string().max(20), key: z.string().max(64) });

/** "Pay now" on the order page, for an order that isn't paid yet. */
export async function resumePayment(raw: unknown): Promise<{ ok: true; payment: PaymentStart } | { ok: false; error: string }> {
  const parsed = OrderRef.safeParse(raw);
  const order = parsed.success ? await getOrderWithKey(parsed.data.number, parsed.data.key) : null;
  if (!order) return { ok: false, error: 'We couldn’t find that order.' };
  if (order.status !== 'pending_payment') return { ok: false, error: 'This order doesn’t need a payment.' };
  try {
    return { ok: true, payment: await startPayment(order) };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

const Confirm = OrderRef.extend({ razorpayOrderId: z.string().max(64), razorpayPaymentId: z.string().max(64), signature: z.string().max(200) });

/** Called by the page after Razorpay says the payment went through. The signature proves it. */
export async function confirmPayment(raw: unknown): Promise<ActionResult> {
  const parsed = Confirm.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'That payment confirmation could not be read.' };
  const p = parsed.data;
  const order = await getOrderWithKey(p.number, p.key);
  if (!order || order.razorpayOrderId !== p.razorpayOrderId) return { ok: false, error: 'We couldn’t find that order.' };
  if (!verifyRazorpayPayment({ orderId: p.razorpayOrderId, paymentId: p.razorpayPaymentId, signature: p.signature })) {
    return { ok: false, error: 'We couldn’t confirm the payment. If money was taken, it will be confirmed automatically within a few minutes or refunded.' };
  }
  if (await markPaid(order.id, { paymentId: p.razorpayPaymentId, via: 'Razorpay' })) after(() => sendOrderEmails(order.id));
  return { ok: true };
}

const Mock = OrderRef.extend({ outcome: z.enum(['paid', 'failed']) });

/** The test payment screen (no keys, development only). */
export async function mockPayment(raw: unknown): Promise<ActionResult> {
  if (paymentsMode() !== 'mock') return { ok: false, error: 'Test payments are switched off.' };
  const parsed = Mock.safeParse(raw);
  const order = parsed.success ? await getOrderWithKey(parsed.data.number, parsed.data.key) : null;
  if (!parsed.success || !order) return { ok: false, error: 'We couldn’t find that order.' };
  if (parsed.data.outcome === 'failed') {
    await markPaymentFailed(order.id, 'Test payment declined');
    return { ok: true };
  }
  if (await markPaid(order.id, { paymentId: `test_${crypto.randomUUID().slice(0, 12)}`, via: 'test payment' })) after(() => sendOrderEmails(order.id));
  return { ok: true };
}
