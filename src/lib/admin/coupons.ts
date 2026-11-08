import 'server-only';
import { desc, eq, ne, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { couponState, readCouponForm, type CouponForm, type CouponState } from './coupon-form';

export type CouponRow = typeof s.coupons.$inferSelect;

/** Every coupon, newest first, with whether it's live, scheduled, expired, used up or off right now. */
export async function listCoupons(): Promise<Array<CouponRow & { state: CouponState }>> {
  const rows = await db.select().from(s.coupons).orderBy(desc(s.coupons.isActive), desc(s.coupons.createdAt));
  const now = Math.floor(Date.now() / 1000);
  return rows.map((c) => ({ ...c, state: couponState(c, now) }));
}

export async function getCoupon(id: number): Promise<CouponRow | null> {
  return (await db.query.coupons.findFirst({ where: eq(s.coupons.id, id) })) ?? null;
}

export type SaveCouponResult = { ok: true; id: number } | { ok: false; error: string; field?: keyof CouponForm };

export async function saveCoupon(id: number | null, form: CouponForm): Promise<SaveCouponResult> {
  const r = readCouponForm(form);
  if (!r.ok) return r;
  const v = r.values;
  const clash = await db.query.coupons.findFirst({ columns: { id: true }, where: id ? and(eq(s.coupons.code, v.code), ne(s.coupons.id, id)) : eq(s.coupons.code, v.code) });
  if (clash) return { ok: false, error: `There is already a coupon ${v.code}.`, field: 'code' };
  if (id) {
    const done = await db.update(s.coupons).set(v).where(eq(s.coupons.id, id)).returning({ id: s.coupons.id });
    if (!done.length) return { ok: false, error: 'This coupon was deleted.' };
    return { ok: true, id };
  }
  const [row] = await db
    .insert(s.coupons)
    .values({ ...v, createdAt: Math.floor(Date.now() / 1000) })
    .returning({ id: s.coupons.id });
  return { ok: true, id: row.id };
}

export async function setCouponActive(id: number, isActive: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const done = await db.update(s.coupons).set({ isActive }).where(eq(s.coupons.id, id)).returning({ id: s.coupons.id });
  return done.length ? { ok: true } : { ok: false, error: 'This coupon was deleted.' };
}

/** Unused coupons can be deleted; used ones are switched off instead, so past orders still make sense. */
export async function deleteCoupon(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await getCoupon(id);
  if (!c) return { ok: true };
  if (c.usedCount > 0) return { ok: false, error: 'This coupon has been used, so it can’t be deleted. Switch it off instead.' };
  await db.delete(s.coupons).where(eq(s.coupons.id, id));
  return { ok: true };
}
