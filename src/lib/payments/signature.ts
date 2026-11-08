import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay signature checks. Both are HMAC-SHA256 in hex:
 * - after checkout: of "order_id|payment_id", with your key secret
 * - webhooks: of the raw request body, with your webhook secret
 */

export const hmacHex = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function verifyPaymentSignature(p: { orderId: string; paymentId: string; signature: string }, secret: string): boolean {
  if (!secret || !p.orderId || !p.paymentId || !p.signature) return false;
  return safeEqual(hmacHex(secret, `${p.orderId}|${p.paymentId}`), p.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  return safeEqual(hmacHex(secret, rawBody), signature);
}
