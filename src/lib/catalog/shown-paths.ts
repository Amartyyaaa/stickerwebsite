import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import * as s from '@/lib/db/schema';

/** Ids of the categories and vibes shoppers can see, for the 404 check in the proxy (which keeps its own copy for a minute). */
export async function getShownPaths(): Promise<{ types: string[]; vibes: string[] }> {
  const [types, vibes] = await Promise.all([
    db.select({ id: s.productTypes.id }).from(s.productTypes).where(and(eq(s.productTypes.isActive, true), ne(s.productTypes.groupId, 'custom'))),
    db.select({ id: s.vibes.id }).from(s.vibes).where(eq(s.vibes.isActive, true)),
  ]);
  return { types: types.map((t) => t.id), vibes: vibes.map((v) => v.id) };
}
