import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { addresses } from '@/lib/db/schema';
import type { AddressInput } from '@/lib/india';

export interface SavedAddressView {
  id: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export async function listAddresses(userId: string): Promise<SavedAddressView[]> {
  const rows = await db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return rows.map(({ userId: _u, createdAt: _c, ...a }) => a);
}

/** Add or update an address. The first address (or one marked default) becomes the default. */
export async function upsertAddress(userId: string, a: AddressInput, opts: { id?: number; makeDefault?: boolean }): Promise<void> {
  const existing = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId));
  const makeDefault = opts.makeDefault || existing.length === 0 || (existing.length === 1 && existing[0].id === opts.id);
  await db.transaction(async (tx) => {
    if (makeDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    if (opts.id) {
      await tx
        .update(addresses)
        .set({ ...a, ...(makeDefault ? { isDefault: true } : {}) })
        .where(and(eq(addresses.id, opts.id), eq(addresses.userId, userId)));
    } else {
      await tx.insert(addresses).values({ userId, ...a, isDefault: makeDefault, createdAt: Math.floor(Date.now() / 1000) });
    }
  });
}

export async function deleteAddress(userId: string, id: number): Promise<void> {
  const [gone] = await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning({ isDefault: addresses.isDefault });
  if (gone?.isDefault) {
    const [next] = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.createdAt)).limit(1);
    if (next) await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
  }
}

export async function setDefaultAddress(userId: string, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    await tx
      .update(addresses)
      .set({ isDefault: true })
      .where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  });
}
