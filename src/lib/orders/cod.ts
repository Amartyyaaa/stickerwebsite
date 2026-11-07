import { formatINR } from '@/lib/money';
import type { StoreSettings } from '@/lib/settings';

export type CodCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether Cash on Delivery is available. `total` is the order value before the
 * COD fee (items after offers, plus shipping).
 */
export function codCheck(s: Pick<StoreSettings, 'cod'>, total: number, hasCustom: boolean): CodCheck {
  if (!s.cod.enabled) return { ok: false, reason: 'Cash on Delivery is paused right now. Please pay online.' };
  if (hasCustom && !s.cod.allowCustom) return { ok: false, reason: 'Custom prints are made just for you, so they need online payment.' };
  if (total < s.cod.min) return { ok: false, reason: `Cash on Delivery is available on orders of ${formatINR(s.cod.min)} or more.` };
  if (total > s.cod.max) return { ok: false, reason: `Cash on Delivery is available on orders up to ${formatINR(s.cod.max)}. Please pay online.` };
  return { ok: true };
}
