import 'server-only';
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
  if (process.env.NODE_ENV !== 'production' || process.env.PAYMENTS_MOCK === '1') return 'mock';
  return 'off';
}

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
