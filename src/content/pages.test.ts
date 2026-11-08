import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type StoreSettings } from '@/lib/settings';
import { getInfoPage, policyPlaceholders } from './pages';

const filled: StoreSettings = {
  ...DEFAULT_SETTINGS,
  contact: { ...DEFAULT_SETTINGS.contact, email: 'hello@printyourvibe.in', phone: '+91 98765 43210', whatsapp: '+91 98765 43210', address: '12, MG Road, Bengaluru 560001' },
  business: { name: 'Vibe Prints LLP', address: '12, MG Road, Bengaluru 560001', gstin: '', city: 'Bengaluru', grievanceName: 'Asha Rao', grievanceDesignation: 'Founder', policiesUpdated: '2026-11-01' },
  aboutStory: 'We started in a Bengaluru flat.\n\nNow we print for fans across India.',
};

describe('policy pages', () => {
  it('list every placeholder left on a new store', () => {
    const left = policyPlaceholders(DEFAULT_SETTINGS);
    const all = left.flatMap((p) => p.placeholders);
    expect(left.map((p) => p.slug)).toEqual(['about', 'contact', 'faq', 'returns', 'privacy', 'terms']);
    expect(all).toContain('[your support email]');
    expect(all).toContain('[name of grievance officer]');
    expect(all).toContain('[your city]');
    expect(all).toContain('[date]');
  });
  it('fill in business details, the grievance officer, dates and the story from settings', () => {
    expect(policyPlaceholders(filled)).toEqual([]);
    const about = getInfoPage('about', filled)!;
    expect(about.blocks[0].paragraphs).toContain('Now we print for fans across India.');
    expect(about.blocks.at(-1)!.paragraphs![0]).toBe('Vibe Prints LLP · 12, MG Road, Bengaluru 560001');
    expect(getInfoPage('contact', filled)!.blocks[2].paragraphs![0]).toContain('Asha Rao, Founder, hello@printyourvibe.in, +91 98765 43210');
    expect(getInfoPage('terms', filled)!.blocks[0].paragraphs![0]).toContain('Last updated: 1 Nov 2026');
    expect(getInfoPage('terms', filled)!.blocks.at(-1)!.paragraphs![0]).toContain('Courts in Bengaluru');
  });
});
