'use server';

import { z } from 'zod';
import { db } from '@/lib/db/client';
import { subscribers } from '@/lib/db/schema';

export interface SubscribeState {
  ok: boolean;
  message: string;
}

const Email = z.string().trim().toLowerCase().email().max(200);

export async function subscribe(_prev: SubscribeState | null, form: FormData): Promise<SubscribeState> {
  const parsed = Email.safeParse(form.get('email'));
  if (!parsed.success) return { ok: false, message: 'Enter an email address like name@example.com.' };
  await db.insert(subscribers).values({ email: parsed.data, createdAt: Math.floor(Date.now() / 1000) }).onConflictDoNothing();
  return { ok: true, message: 'You’re on the list. New drops will reach your inbox.' };
}
