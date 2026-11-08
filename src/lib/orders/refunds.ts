import type { PaymentStatus } from './types';

/**
 * How much can still be refunded: only money actually received (online
 * payments, or COD once it has been collected and marked paid).
 */
export function refundable(o: { paymentStatus: PaymentStatus; total: number; refundedAmount: number }): number {
  if (o.paymentStatus !== 'paid' && o.paymentStatus !== 'refunded') return 0;
  return Math.max(0, o.total - o.refundedAmount);
}
