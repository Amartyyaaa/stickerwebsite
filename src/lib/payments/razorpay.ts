import 'server-only';
import { isLocalSite } from '@/lib/site';
import { verifyPaymentSignature } from './signature';

/**
 * Online payments.
 * - "razorpay": live or test keys are set (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).
 * - "mock": no keys, on a development machine (or PAYMENTS_MOCK=1 for local
 *   production tests). A clearly labelled test screen stands in for Razorpay.
 * - "off": no keys on the live site, so only Cash on Delivery is offered.
 */
export type PaymentsMode = 'razorpay' | 'mock' | 'off';

export function paymentsMode(): PaymentsMode {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return 'razorpay';
  if (process.env.NODE_ENV !== 'production') return 'mock';
  // The test payment screen in a production build is only for trying the store on your own computer.
  // On a real address it's ignored, so a leftover PAYMENTS_MOCK can never mark orders paid.
  if (process.env.PAYMENTS_MOCK === '1' && isLocalSite()) return 'mock';
  return 'off';
}

export { isLocalSite };

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID ?? '';

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Create a Razorpay order for the amount in paise. The receipt is our order number. */
export async function createRazorpayOrder(input: { amount: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount: input.amount, currency: 'INR', receipt: input.receipt, notes: input.notes }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as RazorpayOrder;
}

export const verifyRazorpayPayment = (p: { orderId: string; paymentId: string; signature: string }) => verifyPaymentSignature(p, process.env.RAZORPAY_KEY_SECRET ?? '');

export interface RazorpayRefund {
  id: string;
  amount: number;
  status: string;
}

/** Refund part or all of a captured payment (amount in paise). */
export async function createRazorpayRefund(paymentId: string, amount: number, notes: Record<string, string>): Promise<RazorpayRefund> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({ amount, speed: 'normal', notes }),
  });
  if (!res.ok) throw new Error(`Razorpay refund failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as RazorpayRefund;
}
