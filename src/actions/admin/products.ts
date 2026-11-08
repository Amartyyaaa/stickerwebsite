'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { asAdmin } from '@/lib/admin/action';
import { bulkProducts, deleteDemoProducts, saveProduct, type SaveProductResult } from '@/lib/admin/products';

const ProductForm = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().max(200),
  slug: z.string().max(200),
  typeId: z.string().max(80),
  vibeId: z.string().max(80),
  extraVibes: z.array(z.string().max(80)).max(10),
  description: z.string().max(5000),
  tags: z.string().max(1000),
  images: z.array(z.string().max(200)).max(20),
  startingPrice: z.string().max(20),
  popularity: z.number(),
  isActive: z.boolean(),
});

export async function saveProductAction(raw: unknown): Promise<SaveProductResult> {
  const p = ProductForm.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read. Reload the page and try again.' };
  const { id, ...input } = p.data;
  return asAdmin(async () => {
    const r = await saveProduct(id, input);
    if (r.ok) updateTag('catalog');
    return r;
  });
}

const Bulk = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(['show', 'hide', 'delete', 'vibe']),
  vibeId: z.string().max(80).optional(),
});

export type BulkResult = { ok: true; changed: number; skipped: number } | { ok: false; error: string };

export async function bulkProductsAction(raw: unknown): Promise<BulkResult> {
  const p = Bulk.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Select some products first.' };
  return asAdmin(async () => {
    const r = await bulkProducts(p.data.ids, p.data.action, p.data.vibeId);
    if (r.ok) updateTag('catalog');
    return r;
  });
}

export async function deleteDemoProductsAction(): Promise<{ ok: true; removed: number } | { ok: false; error: string }> {
  return asAdmin(async () => {
    const removed = await deleteDemoProducts();
    updateTag('catalog');
    return { ok: true as const, removed };
  });
}
