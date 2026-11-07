/**
 * Store-wide settings: shipping, Cash on Delivery, offers and contact details.
 * Stored in the `settings` table under the key "store"; these defaults are what
 * a fresh database is seeded with. All amounts are in paise.
 */
export interface PackTier {
  qty: number;
  price: number;
}

export interface BuyXGetY {
  id: string;
  label: string;
  enabled: boolean;
  /** Product types the offer applies to. */
  types: string[];
  buy: number;
  free: number;
}

export interface StoreSettings {
  shipping: { freeAbove: number; fee: number };
  cod: {
    enabled: boolean;
    fee: number;
    /** Order value limits for COD, before the COD fee. */
    min: number;
    max: number;
    /** Allow COD on orders with custom-studio items (off: they're made for one buyer, so a refused parcel is a total loss). */
    allowCustom: boolean;
  };
  prepaidDiscount: { percent: number; max: number };
  packs: {
    enabled: boolean;
    /** Product types whose single stickers count towards a pack. */
    types: string[];
    /** Only these option values count (for example small and medium, matte or glossy). */
    options: Record<string, string[]>;
    tiers: PackTier[];
  };
  bxgy: BuyXGetY[];
  announcement: string[];
  contact: { email: string; phone: string; whatsapp: string; address: string; hours: string };
  delivery: { metroDays: [number, number]; standardDays: [number, number]; remoteDays: [number, number] };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  shipping: { freeAbove: 49900, fee: 4900 },
  cod: { enabled: true, fee: 4900, min: 19900, max: 300000, allowCustom: false },
  prepaidDiscount: { percent: 5, max: 5000 },
  packs: {
    enabled: true,
    types: ['laptop-stickers', 'phone-bottle-stickers'],
    options: { size: ['XS', 'S', 'M'], finish: ['matte', 'glossy'] },
    tiers: [
      { qty: 10, price: 19900 },
      { qty: 20, price: 34900 },
      { qty: 50, price: 69900 },
    ],
  },
  bxgy: [
    {
      id: 'posters-buy-3-get-1',
      label: 'Buy 3 posters, get 1 free',
      enabled: true,
      types: ['wall-posters'],
      buy: 3,
      free: 1,
    },
  ],
  announcement: ['Any 10 stickers for ₹199', 'Free shipping above ₹499', 'Cash on Delivery available'],
  contact: { email: '', phone: '', whatsapp: '', address: '', hours: 'Monday to Saturday, 10 am to 7 pm' },
  delivery: { metroDays: [3, 5], standardDays: [4, 7], remoteDays: [6, 10] },
};

/** Fill in any keys missing from a stored settings object (for example after an upgrade). */
export function withDefaults(stored: Partial<StoreSettings> | null | undefined): StoreSettings {
  const s = stored ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    shipping: { ...DEFAULT_SETTINGS.shipping, ...s.shipping },
    cod: { ...DEFAULT_SETTINGS.cod, ...s.cod },
    prepaidDiscount: { ...DEFAULT_SETTINGS.prepaidDiscount, ...s.prepaidDiscount },
    packs: { ...DEFAULT_SETTINGS.packs, ...s.packs },
    contact: { ...DEFAULT_SETTINGS.contact, ...s.contact },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...s.delivery },
  };
}
