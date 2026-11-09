import type { OrderStatus, PaymentStatus } from './types';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Waiting for payment',
  placed: 'Placed',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Not paid yet',
  paid: 'Paid',
  cod_due: 'Pay on delivery',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

/** The normal path of an order, shown as the timeline. */
export const FLOW: OrderStatus[] = ['placed', 'confirmed', 'printing', 'shipped', 'delivered'];

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['placed', 'cancelled'],
  // Paid orders can go straight to printing; COD orders are confirmed with the shopper first.
  placed: ['confirmed', 'printing', 'cancelled'],
  confirmed: ['printing', 'cancelled'],
  printing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

export const canMove = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to);

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  at: number | null;
  state: 'done' | 'current' | 'todo';
}

/**
 * Timeline for the order page: every normal step with the time it happened.
 * A cancelled or refunded order ends with that step instead.
 */
export function timeline(status: OrderStatus, events: Array<{ status: OrderStatus; at: number }>): TimelineStep[] {
  const when = (s: OrderStatus) => events.filter((e) => e.status === s).at(-1)?.at ?? null;
  if (status === 'pending_payment') return [{ status, label: STATUS_LABEL[status], at: when(status), state: 'current' }];
  const stopped = status === 'cancelled' || status === 'refunded';
  const reached = FLOW.filter((s) => when(s) !== null);
  const current = stopped ? null : FLOW.indexOf(status);
  const steps: TimelineStep[] = (stopped ? reached : FLOW).map((s, i) => ({
    status: s,
    label: STATUS_LABEL[s],
    at: when(s),
    state: stopped || (current !== null && i < current) ? 'done' : i === current ? 'current' : 'todo',
  }));
  if (stopped) {
    if (status === 'refunded' && when('cancelled') !== null) steps.push({ status: 'cancelled', label: STATUS_LABEL.cancelled, at: when('cancelled'), state: 'done' });
    steps.push({ status, label: STATUS_LABEL[status], at: when(status), state: 'current' });
  }
  return steps;
}

/** Shoppers can cancel an order themselves until printing starts. */
export const SHOPPER_CANCELLABLE: readonly OrderStatus[] = ['pending_payment', 'placed', 'confirmed'];

/** Reasons a shopper picks when cancelling ("other" asks for a few words). */
export const CANCEL_REASONS = [
  { id: 'mistake', label: 'Ordered by mistake' },
  { id: 'change-items', label: 'Want to change items or size' },
  { id: 'change-address', label: 'Want to change the delivery address' },
  { id: 'too-slow', label: 'Delivery is taking too long' },
  { id: 'cheaper', label: 'Found it cheaper elsewhere' },
  { id: 'other', label: 'Other' },
] as const;

export type CancelReasonId = (typeof CANCEL_REASONS)[number]['id'];

/** The reason as saved on the order: the label, or the shopper's own words for "other". */
export function cancelReasonText(id: string, other: string): string | null {
  const reason = CANCEL_REASONS.find((r) => r.id === id);
  if (!reason) return null;
  if (reason.id !== 'other') return reason.label;
  const words = other.trim().replace(/\s+/g, ' ');
  return words.length >= 3 ? words.slice(0, 200) : null;
}
