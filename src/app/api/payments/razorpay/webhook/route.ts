import { eq } from 'drizzle-orm';
import { after } from 'next/server';
import { db } from '@/lib/db/client';
import { paymentEvents } from '@/lib/db/schema';
import { findByRazorpayOrder, markPaid, markPaymentFailed, sendOrderEmails } from '@/lib/orders/service';
import { verifyWebhookSignature } from '@/lib/payments/signature';

interface RazorpayEvent {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; error_description?: string } };
    order?: { entity?: { id?: string; amount_paid?: number } };
  };
}

/**
 * Razorpay webhook (set it up in the Razorpay dashboard for payment.captured,
 * order.paid and payment.failed). It catches payments where the shopper closed
 * the tab before returning to the store. Repeated deliveries change nothing.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook not configured', { status: 503 });
  const body = await request.text();
  if (!verifyWebhookSignature(body, request.headers.get('x-razorpay-signature'), secret)) return new Response('Invalid signature', { status: 400 });

  let event: RazorpayEvent;
  try {
    event = JSON.parse(body) as RazorpayEvent;
  } catch {
    return new Response('Invalid body', { status: 400 });
  }
  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;
  const eventId = request.headers.get('x-razorpay-event-id') ?? `${event.event}:${payment?.id ?? razorpayOrderId ?? 'unknown'}`;

  const fresh = await db
    .insert(paymentEvents)
    .values({ id: eventId.slice(0, 120), type: String(event.event).slice(0, 60), createdAt: Math.floor(Date.now() / 1000) })
    .onConflictDoNothing()
    .returning({ id: paymentEvents.id });
  if (!fresh.length) return Response.json({ ok: true, duplicate: true });

  const order = razorpayOrderId ? await findByRazorpayOrder(razorpayOrderId) : null;
  if (!order) return Response.json({ ok: true, ignored: true });
  await db.update(paymentEvents).set({ orderId: order.id }).where(eq(paymentEvents.id, fresh[0].id));

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const amount = payment?.amount ?? event.payload?.order?.entity?.amount_paid;
    if (amount !== order.total || (payment?.currency && payment.currency !== 'INR')) {
      console.error(`[razorpay] Amount mismatch on ${order.number}: paid ${amount}, expected ${order.total}`);
      return Response.json({ ok: true, mismatch: true });
    }
    if (await markPaid(order.id, { paymentId: payment?.id ?? 'unknown', via: 'Razorpay webhook' })) after(() => sendOrderEmails(order.id));
  } else if (event.event === 'payment.failed') {
    await markPaymentFailed(order.id, payment?.error_description ?? 'Payment declined');
  }
  return Response.json({ ok: true });
}
