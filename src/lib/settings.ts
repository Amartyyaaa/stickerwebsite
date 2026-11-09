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

/** The big banner at the top of the home page. */
export interface HomeHero {
  eyebrow: string;
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** A product photo address (/api/uploads/…) shown instead of the generated artwork. */
  image: string | null;
}

export interface StoreSettings {
  shipping: { freeAbove: number; fee: number };
  /** A fixed fee on every order, in paise (0 for none). Shown in the cart and at checkout. */
  platformFee: number;
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
  /** `whatsappAlt` is a second WhatsApp number; the chat button offers both. */
  contact: { email: string; phone: string; whatsapp: string; whatsappAlt: string; address: string; hours: string };
  /** Full links to the store's profiles, shown in the footer when set. */
  social: { instagram: string; youtube: string; facebook: string; x: string };
  home: HomeHero;
  /**
   * Shown on receipts, packing slips and the policy pages. Indian e-commerce rules ask online sellers to
   * name a grievance officer; `city` decides which courts the terms refer to.
   */
  business: { name: string; address: string; gstin: string; city: string; grievanceName: string; grievanceDesignation: string; policiesUpdated: string };
  /** The store's story on the About page. */
  aboutStory: string;
  delivery: { metroDays: [number, number]; standardDays: [number, number]; remoteDays: [number, number] };
}

export const DEFAULT_SETTINGS: StoreSettings = {
  shipping: { freeAbove: 49900, fee: 4900 },
  platformFee: 500,
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
  contact: { email: 'wecare.printyourvibe@gmail.com', phone: '', whatsapp: '+91 80028 98685', whatsappAlt: '+91 98016 44598', address: '', hours: 'Monday to Saturday, 10 am to 7 pm' },
  social: { instagram: '', youtube: '', facebook: '', x: '' },
  home: {
    eyebrow: '//// New drop',
    title: 'JDM night-run poster series',
    body: 'Car, anime and gaming posters printed big and sharp. A4 to A2, framed or unframed.',
    primary: { label: 'Shop JDM posters', href: '/v/jdm?type=wall-posters' },
    secondary: { label: 'All new drops', href: '/shop?sort=new' },
    image: null,
  },
  business: { name: 'PrintYourVibe', address: '', gstin: '', city: '', grievanceName: '', grievanceDesignation: '', policiesUpdated: '' },
  aboutStory: '',
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
    social: { ...DEFAULT_SETTINGS.social, ...s.social },
    home: {
      ...DEFAULT_SETTINGS.home,
      ...s.home,
      primary: { ...DEFAULT_SETTINGS.home.primary, ...s.home?.primary },
      secondary: { ...DEFAULT_SETTINGS.home.secondary, ...s.home?.secondary },
    },
    business: { ...DEFAULT_SETTINGS.business, ...s.business },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...s.delivery },
  };
}
