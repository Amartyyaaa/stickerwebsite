import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

export const CUSTOMERS_PER_PAGE = 50;

export interface CustomerRow {
  email: string;
  name: string;
  phone: string;
  orders: number;
  /** Paise: orders that went ahead (not cancelled or unpaid), less refunds. */
  spent: number;
  lastOrder: number;
  hasAccount: boolean;
}

/**
 * Customers grouped by email from their orders, with or without an account.
 * Name and phone come from their latest order. Unpaid online orders that never
 * went through don't count.
 */
export async function listCustomers(f: { q?: string; page: number }): Promise<{ rows: CustomerRow[]; total: number }> {
  const q = f.q?.trim().toLowerCase();
  const like = q ? `%${q.replace(/[%_\\]/g, '')}%` : null;
  const digits = q?.replace(/\D/g, '') ?? '';
  const search = like
    ? sql`HAVING lower(email) LIKE ${like} OR lower(name) LIKE ${like}${digits.length >= 4 ? sql` OR phone LIKE ${`%${digits.slice(-10)}%`}` : sql``}`
    : sql``;
  const grouped = sql`
    SELECT lower(o.email) AS email,
      (SELECT o2.name FROM orders o2 WHERE lower(o2.email) = lower(o.email) ORDER BY o2.created_at DESC LIMIT 1) AS name,
      (SELECT o2.phone FROM orders o2 WHERE lower(o2.email) = lower(o.email) ORDER BY o2.created_at DESC LIMIT 1) AS phone,
      count(*) AS orders,
      sum(CASE WHEN o.status = 'cancelled' AND o.payment_status != 'refunded' THEN 0 ELSE o.total - o.refunded_amount END) AS spent,
      max(o.created_at) AS last_order,
      EXISTS (SELECT 1 FROM user u WHERE lower(u.email) = lower(o.email)) AS has_account
    FROM orders o
    WHERE NOT (o.payment_method = 'online' AND o.paid_at IS NULL)
    GROUP BY lower(o.email) ${search}`;
  const page = Math.max(1, f.page);
  const [rows, [{ n }]] = await Promise.all([
    db.all<{ email: string; name: string; phone: string; orders: number; spent: number | null; last_order: number; has_account: number }>(
      sql`${grouped} ORDER BY last_order DESC LIMIT ${CUSTOMERS_PER_PAGE} OFFSET ${(page - 1) * CUSTOMERS_PER_PAGE}`,
    ),
    db.all<{ n: number }>(sql`SELECT count(*) AS n FROM (${grouped})`),
  ]);
  return {
    total: n,
    rows: rows.map((r) => ({ email: r.email, name: r.name, phone: r.phone, orders: r.orders, spent: r.spent ?? 0, lastOrder: r.last_order, hasAccount: Boolean(r.has_account) })),
  };
}
