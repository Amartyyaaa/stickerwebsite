'use server';

import { normalizePhone } from '@/lib/india';
import { normalizeOrderNumber } from '@/lib/orders/numbers';
import { findForTracking, type TrackedOrder } from '@/lib/orders/service';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export type TrackState = { ok: true; order: TrackedOrder } | { ok: false; error: string } | null;

const NOT_FOUND = 'We couldn’t find an order with that number and phone. Check both and try again.';

/** Look up an order by its number and the phone it was placed with. */
export async function trackOrder(_prev: TrackState, form: FormData): Promise<TrackState> {
  const limit = await rateLimit(`track:${await clientIp()}`, 20, 600);
  if (!limit.ok) return { ok: false, error: 'Too many tries. Please wait a few minutes and try again.' };
  const number = normalizeOrderNumber(String(form.get('number') ?? ''));
  const phone = normalizePhone(String(form.get('phone') ?? ''));
  if (!number || phone.length !== 10) return { ok: false, error: NOT_FOUND };
  const order = await findForTracking(number, phone);
  return order ? { ok: true, order } : { ok: false, error: NOT_FOUND };
}
