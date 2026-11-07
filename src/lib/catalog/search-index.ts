import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';

/**
 * Rebuild full-text search rows. Pass product ids to refresh just those
 * (after an admin edit), or nothing to rebuild the whole index.
 */
export async function reindexProducts(ids?: number[]): Promise<void> {
  const select = sql`
    INSERT INTO products_fts (rowid, name, tags, type_name, vibe_names)
    SELECT p.id, p.name, p.tags, t.name || ' ' || t.singular,
      (SELECT group_concat(v.name, ' ') FROM product_vibes pv JOIN vibes v ON v.id = pv.vibe_id WHERE pv.product_id = p.id)
    FROM products p JOIN product_types t ON t.id = p.type_id
    WHERE p.is_active = 1`;
  if (!ids) {
    await db.run(sql`DELETE FROM products_fts`);
    await db.run(select);
    return;
  }
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const list = sql.join(chunk.map((id) => sql`${id}`), sql`, `);
    await db.run(sql`DELETE FROM products_fts WHERE rowid IN (${list})`);
    await db.run(sql`${select} AND p.id IN (${list})`);
  }
}
