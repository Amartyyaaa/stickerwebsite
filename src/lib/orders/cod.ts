import { formatINR } from '@/lib/money';
import type { StoreSettings } from '@/lib/settings';

export type CodCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether Cash on Delivery is available. `total` is the order value before the
 * COD fee (items after offers, plus shipping).
 *
 * `online: false` means online payments aren't set up yet (no Razorpay keys), so COD is
 * the only way to pay: the minimum order and the custom-print rule are set aside until
 * online payments are on. The maximum still applies, and so does switching COD off.
 */
export function codCheck(s: Pick<StoreSettings, 'cod'>, total: number, hasCustom: boolean, { online = true }: { online?: boolean } = {}): CodCheck {
  const elsewhere = online ? 'Please pay online.' : 'Please contact us to order.';
  if (!s.cod.enabled) return { ok: false, reason: `Cash on Delivery is paused right now. ${elsewhere}` };
  if (online && hasCustom && !s.cod.allowCustom) return { ok: false, reason: 'Custom prints are made just for you, so they need online payment.' };
  if (online && total < s.cod.min) return { ok: false, reason: `Cash on Delivery is available on orders of ${formatINR(s.cod.min)} or more.` };
  if (total > s.cod.max) return { ok: false, reason: `Cash on Delivery is available on orders up to ${formatINR(s.cod.max)}. ${elsewhere}` };
  return { ok: true };
}
