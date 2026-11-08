'use server';

import { z } from 'zod';
import { AddressInput, fieldErrors } from '@/lib/india';
import { deleteAddress, setDefaultAddress, upsertAddress } from '@/lib/orders/addresses';
import { getViewer } from '@/lib/viewer';

export type AddressResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

const Save = z.object({ id: z.number().int().positive().optional(), address: AddressInput, makeDefault: z.boolean().optional() });

export async function saveAddressAction(raw: unknown): Promise<AddressResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: 'Please sign in again.' };
  const parsed = Save.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Please check the highlighted details.', fields: fieldErrors(parsed.error) };
  await upsertAddress(viewer.id, parsed.data.address, { id: parsed.data.id, makeDefault: parsed.data.makeDefault });
  return { ok: true };
}

const Id = z.number().int().positive();

export async function deleteAddressAction(id: unknown): Promise<AddressResult> {
  const viewer = await getViewer();
  const parsed = Id.safeParse(id);
  if (!viewer || !parsed.success) return { ok: false, error: 'Please sign in again.' };
  await deleteAddress(viewer.id, parsed.data);
  return { ok: true };
}

export async function setDefaultAddressAction(id: unknown): Promise<AddressResult> {
  const viewer = await getViewer();
  const parsed = Id.safeParse(id);
  if (!viewer || !parsed.success) return { ok: false, error: 'Please sign in again.' };
  await setDefaultAddress(viewer.id, parsed.data);
  return { ok: true };
}
