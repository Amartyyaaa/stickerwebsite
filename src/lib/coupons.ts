import 'server-only';
import { and, eq, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';
import { couponProblem, normalizeCode, type CouponRecord, type CouponRule } from '@/lib/pricing/coupons';

/** Coupon lookups for pricing and checkout. Admin editing is in src/lib/admin/coupons.ts. */

export type CouponRow = typeof s.coupons.$inferSelect;

export const toRecord = (c: CouponRow): CouponRecord => ({
  code: c.code,
  kind: c.kind,
  value: c.value,
  minOrder: c.minOrder,
  maxDiscount: c.maxDiscount,
  isActive: c.isActive,
  startsAt: c.startsAt,
  endsAt: c.endsAt,
  usageLimit: c.usageLimit,
  perCustomer: c.perCustomer,
  usedCount: c.usedCount,
});

/** Orders from this email that used the code: COD orders once placed, online orders once paid. */
export async function usesByEmail(code: string, email: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(s.orders)
    .where(
      and(
        eq(s.orders.couponCode, code),
        sql`lower(${s.orders.email}) = ${email.trim().toLowerCase()}`,
        or(eq(s.orders.paymentMethod, 'cod'), isNotNull(s.orders.paidAt)),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Check a code the shopper typed. Returns the rule for the pricing engine, or
 * the reason it can't be used. Without an email, the per-shopper limit is
 * checked at checkout instead.
 */
export async function resolveCoupon(input: string, email?: string): Promise<{ code: string; rule: CouponRule | null; problem: string | null }> {
  const code = normalizeCode(input);
  const row = code ? await db.query.coupons.findFirst({ where: eq(s.coupons.code, code) }) : undefined;
  const record = row ? toRecord(row) : null;
  const uses = record?.perCustomer !== null && record && email ? await usesByEmail(code, email) : 0;
  const problem = couponProblem(record, { now: Math.floor(Date.now() / 1000), usesByEmail: uses });
  if (problem || !record) return { code, rule: null, problem: problem ?? 'That code isn’t valid.' };
  return { code, rule: { code: record.code, kind: record.kind, value: record.value, minOrder: record.minOrder, maxDiscount: record.maxDiscount }, problem: null };
}

/** Thrown when the last use of a code went to someone else while this order was being placed. */
export class CouponUsedUpError extends Error {
  constructor(code: string) {
    super(`The code ${code} was just fully used. Remove it to place your order.`);
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Count one use. With `enforceLimit`, refuses when the limit is reached (a COD order being placed). */
export async function countCouponUse(tx: Tx | typeof db, code: string, enforceLimit: boolean): Promise<void> {
  const rows = await tx
    .update(s.coupons)
    .set({ usedCount: sql`${s.coupons.usedCount} + 1` })
    .where(and(eq(s.coupons.code, code), enforceLimit ? sql`(${s.coupons.usageLimit} IS NULL OR ${s.coupons.usedCount} < ${s.coupons.usageLimit})` : undefined))
    .returning({ id: s.coupons.id });
  if (enforceLimit && rows.length === 0) throw new CouponUsedUpError(code);
}
