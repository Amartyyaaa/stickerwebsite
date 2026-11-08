'use server';

import { z } from 'zod';
import { NotAdminError, requireAdmin } from '@/lib/admin/guard';
import { cancelOrder, moveOrder, refundOrder, saveNote, shipOrder, type Result } from '@/lib/admin/orders';
import { COURIERS, isTrackingNumber, safeHttpUrl, trackingUrlFor } from '@/lib/orders/couriers';
import type { Viewer } from '@/lib/viewer';

async function asAdmin(fn: (admin: Viewer) => Promise<Result>): Promise<Result> {
  try {
    return await fn(await requireAdmin());
  } catch (err) {
    if (err instanceof NotAdminError) return { ok: false, error: err.message };
    console.error('[admin]', err);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

const Id = z.number().int().positive();
const Move = z.object({ orderId: Id, to: z.enum(['confirmed', 'printing', 'delivered']), note: z.string().max(200).optional() });

export async function moveOrderAction(raw: unknown): Promise<Result> {
  const p = Move.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That change could not be read.' };
  return asAdmin((admin) => moveOrder(p.data.orderId, p.data.to, admin, p.data.note));
}

const Ship = z.object({
  orderId: Id,
  courier: z.string().refine((c) => COURIERS.some((x) => x.name === c), 'Choose a courier.'),
  otherCourier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().refine(isTrackingNumber, 'Enter the tracking (AWB) number.'),
  trackingUrl: z.string().trim().max(500).optional(),
});

export async function shipOrderAction(raw: unknown): Promise<Result> {
  const p = Ship.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Please check the shipping details.' };
  const courier = p.data.courier === 'Other' ? p.data.otherCourier || 'Courier' : p.data.courier;
  let url: string | null = null;
  if (p.data.trackingUrl) {
    url = safeHttpUrl(p.data.trackingUrl);
    if (!url) return { ok: false, error: 'The tracking link should start with https://' };
  } else url = trackingUrlFor(courier, p.data.trackingNumber);
  return asAdmin((admin) => shipOrder(p.data.orderId, { courier, trackingNumber: p.data.trackingNumber.trim(), trackingUrl: url }, admin));
}

const Cancel = z.object({ orderId: Id, reason: z.string().trim().min(3, 'Give a short reason.').max(200) });

export async function cancelOrderAction(raw: unknown): Promise<Result> {
  const p = Cancel.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? 'Give a short reason.' };
  return asAdmin((admin) => cancelOrder(p.data.orderId, p.data.reason, admin));
}

const Refund = z.object({ orderId: Id, rupees: z.number().positive().max(10_000_000), reference: z.string().trim().max(100).default('') });

export async function refundOrderAction(raw: unknown): Promise<Result> {
  const p = Refund.safeParse(raw);
  if (!p.success) return { ok: false, error: 'Enter the amount to refund in rupees.' };
  return asAdmin((admin) => refundOrder(p.data.orderId, Math.round(p.data.rupees * 100), { reference: p.data.reference }, admin));
}

const Note = z.object({ orderId: Id, note: z.string().max(2000) });

export async function saveNoteAction(raw: unknown): Promise<Result> {
  const p = Note.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That note could not be saved.' };
  return asAdmin(() => saveNote(p.data.orderId, p.data.note));
}
