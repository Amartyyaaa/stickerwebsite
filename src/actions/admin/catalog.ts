'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { asAdmin } from '@/lib/admin/action';
import { moveCategory, saveCategory, type Result } from '@/lib/admin/categories';
import { createVibe, deleteVibe, moveVibe, updateVibe } from '@/lib/admin/vibes';

const Amount = z.string().max(20);
const CategoryForm = z.object({
  id: z.string().max(80),
  name: z.string().max(200),
  singular: z.string().max(200),
  description: z.string().max(2000),
  highlights: z.array(z.string().max(500)).max(20),
  isActive: z.boolean(),
  price: z.object({
    base: Amount,
    amounts: z.record(z.string().max(80), z.record(z.string().max(80), z.union([Amount, z.record(z.string().max(80), Amount)]))),
  }),
});

/** Run a catalog change as an admin and refresh the cached store pages when it worked. */
async function change(fn: () => Promise<Result>): Promise<Result> {
  return asAdmin(async () => {
    const r = await fn();
    if (r.ok) updateTag('catalog');
    return r;
  });
}

export async function saveCategoryAction(raw: unknown): Promise<Result> {
  const p = CategoryForm.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read. Reload the page and try again.' };
  const { id, ...input } = p.data;
  return change(() => saveCategory(id, input));
}

const Move = z.object({ id: z.string().max(80), dir: z.union([z.literal(-1), z.literal(1)]) });

export async function moveCategoryAction(raw: unknown): Promise<Result> {
  const p = Move.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return change(() => moveCategory(p.data.id, p.data.dir));
}

const VibeForm = z.object({
  id: z.string().max(80),
  name: z.string().max(200),
  blurb: z.string().max(1000),
  featured: z.boolean(),
  isActive: z.boolean(),
});

export async function createVibeAction(raw: unknown): Promise<Result> {
  const p = VibeForm.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read.' };
  return change(() => createVibe(p.data));
}

export async function updateVibeAction(raw: unknown): Promise<Result> {
  const p = VibeForm.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read.' };
  return change(() => updateVibe(p.data));
}

export async function moveVibeAction(raw: unknown): Promise<Result> {
  const p = Move.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return change(() => moveVibe(p.data.id, p.data.dir));
}

export async function deleteVibeAction(raw: unknown): Promise<Result> {
  const p = z.object({ id: z.string().max(80) }).safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return change(() => deleteVibe(p.data.id));
}
