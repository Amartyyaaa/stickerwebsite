'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { asAdmin } from '@/lib/admin/action';
import { saveHome, saveSettings, type SettingsSaveResult } from '@/lib/admin/settings';

const T = (n = 300) => z.string().max(n);
const Pair = z.tuple([T(5), T(5)]);

const SettingsForm = z.object({
  contact: z.object({ email: T(200), phone: T(30), whatsapp: T(30), whatsappAlt: T(30), address: T(400), hours: T(120) }),
  social: z.object({ instagram: T(), youtube: T(), facebook: T(), x: T() }),
  shipping: z.object({ freeAbove: T(20), fee: T(20) }),
  platformFee: T(20),
  delivery: z.object({ metroDays: Pair, standardDays: Pair, remoteDays: Pair }),
  cod: z.object({ enabled: z.boolean(), fee: T(20), min: T(20), max: T(20), allowCustom: z.boolean() }),
  prepaidDiscount: z.object({ percent: T(5), max: T(20) }),
  packs: z.object({ enabled: z.boolean(), tiers: z.array(z.object({ qty: T(10), price: T(20) })).max(10) }),
  bxgy: z.array(z.object({ id: T(80), label: T(200), enabled: z.boolean(), types: z.array(T(80)).max(40), buy: T(5), free: T(5) })).max(10),
  announcement: T(1000),
  business: z.object({ name: T(200), address: T(400), gstin: T(30), city: T(100), grievanceName: T(120), grievanceDesignation: T(120), policiesUpdated: T(10) }),
  aboutStory: T(3000),
});

export async function saveSettingsAction(raw: unknown): Promise<SettingsSaveResult> {
  const p = SettingsForm.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read. Reload the page and try again.' };
  return asAdmin(async () => {
    const r = await saveSettings(p.data);
    if (r.ok) updateTag('settings');
    return r;
  });
}

const Link = z.object({ label: T(100), href: T(400) });
const Home = z.object({ eyebrow: T(100), title: T(200), body: T(600), primary: Link, secondary: Link, image: T(200).nullable() });

export async function saveHomeAction(raw: unknown): Promise<SettingsSaveResult> {
  const p = Home.safeParse(raw);
  if (!p.success) return { ok: false, error: 'That form could not be read. Reload the page and try again.' };
  return asAdmin(async () => {
    const r = await saveHome(p.data);
    if (r.ok) updateTag('settings');
    return r;
  });
}
