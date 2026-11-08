'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { asAdmin } from '@/lib/admin/action';
import { deleteReview, setReviewStatus } from '@/lib/admin/reviews';

const Input = z.object({ id: z.number().int().positive(), action: z.enum(['approve', 'reject', 'delete']) });

export async function moderateReviewAction(raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = Input.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return asAdmin(async () => {
    const { id, action } = p.data;
    const r = action === 'delete' ? await deleteReview(id) : await setReviewStatus(id, action === 'approve' ? 'approved' : 'rejected');
    // Product pages show approved reviews, so refresh them.
    if (r.ok) updateTag('reviews');
    return r;
  });
}
