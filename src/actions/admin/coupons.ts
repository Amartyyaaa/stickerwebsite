'use server';

import { z } from 'zod';
import { asAdmin } from '@/lib/admin/action';
import { deleteCoupon, saveCoupon, setCouponActive, type SaveCouponResult } from '@/lib/admin/coupons';

const Form = z.object({
  id: z.number().int().positive().nullable(),
  code: z.string().max(40),
  kind: z.enum(['percent', 'flat', 'shipping']),
  value: z.string().max(20),
  minOrder: z.string().max(20),
  maxDiscount: z.string().max(20),
  startsOn: z.string().max(10),
  endsOn: z.string().max(10),
  usageLimit: z.string().max(10),
  perCustomer: z.string().max(10),
  isActive: z.boolean(),
  note: z.string().max(500),
});

// Coupons are read fresh at checkout (never cached), so no cache needs refreshing here.
export async function saveCouponAction(raw: unknown): Promise<SaveCouponResult> {
  const p = Form.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read. Reload the page and try again.' };
  const { id, ...form } = p.data;
  return asAdmin(() => saveCoupon(id, form));
}

const Toggle = z.object({ id: z.number().int().positive(), isActive: z.boolean() });

export async function setCouponActiveAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = Toggle.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return asAdmin(() => setCouponActive(p.data.id, p.data.isActive));
}

export async function deleteCouponAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ id: z.number().int().positive() }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return asAdmin(() => deleteCoupon(p.data.id));
}
