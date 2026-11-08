/**
 * The starting catalog structure: product types (with their options and price
 * profiles) and vibes. The seed script writes these into the database; after
 * that the database is the source of truth and the admin panel edits it.
 * Prices are placeholders in paise. Set your real prices in admin.
 */
import type { ArtKind, PosterKind } from '@/lib/art/types';
import type { GroupId, OptionGroup, PriceProfile } from './types';

export interface ProductTypeDef {
  id: string;
  name: string;
  singular: string;
  groupId: GroupId;
  description: string;
  options: OptionGroup[];
  price: PriceProfile;
  art: ArtKind;
  highlights: string[];
  /** How many demo products the sample seed creates. */
  sample: number;
}

const STICKER_SIZE: OptionGroup = {
  key: 'size',
  label: 'Size',
  values: [
    { value: 'S', label: 'Small', hint: '2 in' },
    { value: 'M', label: 'Medium', hint: '3 in' },
    { value: 'L', label: 'Large', hint: '4 in' },
  ],
};

const POSTER_SIZE: OptionGroup = {
  key: 'size',
  label: 'Size',
  values: [
    { value: 'A4', label: 'A4', hint: '21 × 29.7 cm' },
    { value: 'A3', label: 'A3', hint: '29.7 × 42 cm' },
    { value: 'A2', label: 'A2', hint: '42 × 59.4 cm' },
    { value: '12x18', label: '12 × 18 in', hint: '30 × 46 cm' },
  ],
};

const pack = (key: string, label: string, values: Array<[string, string]>): OptionGroup => ({
  key,
  label,
  values: values.map(([value, l]) => ({ value, label: l })),
});

export const PRODUCT_TYPES: ProductTypeDef[] = [
  {
    id: 'laptop-stickers',
    name: 'Laptop Stickers',
    singular: 'Laptop sticker',
    groupId: 'stickers',
    description: 'Die-cut vinyl stickers for laptops, diaries, bottles and phone cases.',
    options: [
      STICKER_SIZE,
      {
        key: 'finish',
        label: 'Finish',
        values: [
          { value: 'matte', label: 'Matte' },
          { value: 'glossy', label: 'Glossy' },
          { value: 'holographic', label: 'Holographic' },
          { value: 'transparent', label: 'Transparent' },
        ],
      },
    ],
    price: { base: 2900, deltas: { size: { S: 0, M: 1000, L: 2000 }, finish: { matte: 0, glossy: 0, holographic: 2000, transparent: 1000 } } },
    art: 'sticker',
    highlights: ['Waterproof, scratch-resistant vinyl', 'Die-cut to shape with a clean border', 'Peels off laptops and bottles cleanly'],
    sample: 1200,
  },
  {
    id: 'holographic-stickers',
    name: 'Holographic Stickers',
    singular: 'Holographic sticker',
    groupId: 'stickers',
    description: 'Rainbow-foil vinyl stickers that shift colour as they catch the light.',
    options: [STICKER_SIZE],
    price: { base: 4900, deltas: { size: { S: 0, M: 1000, L: 2000 } } },
    art: 'holo',
    highlights: ['Rainbow holographic foil', 'Waterproof vinyl', 'Die-cut to shape'],
    sample: 300,
  },
  {
    id: 'transparent-stickers',
    name: 'Transparent Stickers',
    singular: 'Transparent sticker',
    groupId: 'stickers',
    description: 'Clear vinyl stickers with no background, so your laptop or bottle shows through.',
    options: [STICKER_SIZE],
    price: { base: 3900, deltas: { size: { S: 0, M: 1000, L: 2000 } } },
    art: 'clear',
    highlights: ['Crystal-clear vinyl', 'No white border', 'Waterproof'],
    sample: 200,
  },
  {
    id: '3d-motion-stickers',
    name: '3D Motion Stickers',
    singular: '3D motion sticker',
    groupId: 'stickers',
    description: 'Lenticular stickers that flip between images or seem to move as you tilt them.',
    options: [{ key: 'size', label: 'Size', values: [{ value: 'M', label: 'Medium', hint: '3 in' }, { value: 'L', label: 'Large', hint: '4 in' }] }],
    price: { base: 9900, deltas: { size: { M: 0, L: 3000 } } },
    art: 'motion',
    highlights: ['Lenticular 3D effect that moves as you tilt it', 'Strong adhesive for laptops, phones and lockers', 'Scratch-resistant surface'],
    sample: 250,
  },
  {
    id: '3d-dome-stickers',
    name: '3D Dome Stickers',
    singular: '3D dome sticker',
    groupId: 'stickers',
    description: 'Stickers topped with a raised, glossy resin dome you can feel.',
    options: [{ key: 'size', label: 'Size', values: [{ value: 'S', label: 'Small', hint: '2 in' }, { value: 'M', label: 'Medium', hint: '3 in' }] }],
    price: { base: 7900, deltas: { size: { S: 0, M: 2000 } } },
    art: 'dome',
    highlights: ['Raised, crystal-clear resin dome', 'Waterproof and durable', 'Great on phones, keyboards and bottles'],
    sample: 150,
  },
  {
    id: 'diary-sticker-sheets',
    name: 'Diary Sticker Sheets',
    singular: 'Diary sticker sheet',
    groupId: 'stickers',
    description: 'Kiss-cut sheets of mini stickers for journals, planners and scrapbooks.',
    options: [pack('pack', 'Pack', [['1', '1 sheet'], ['3', '3 sheets'], ['5', '5 sheets']])],
    price: { base: 4900, deltas: { pack: { '1': 0, '3': 9000, '5': 14000 } } },
    art: 'sheet',
    highlights: ['Mini stickers on easy-peel kiss-cut sheets', 'Matte paper you can write on', 'Sized for journals and planners'],
    sample: 300,
  },
  {
    id: 'fridge-magnets',
    name: 'Fridge Magnets',
    singular: 'Fridge magnet',
    groupId: 'stickers',
    description: 'Printed magnets for your fridge, locker or any metal surface.',
    options: [{ key: 'size', label: 'Size', values: [{ value: 'S', label: 'Small', hint: '2.5 in' }, { value: 'M', label: 'Medium', hint: '3.5 in' }] }],
    price: { base: 7900, deltas: { size: { S: 0, M: 3000 } } },
    art: 'magnet',
    highlights: ['Strong, flexible magnet backing', 'Glossy, wipe-clean print', 'Gentle on fridge doors'],
    sample: 300,
  },
  {
    id: 'phone-bottle-stickers',
    name: 'Phone & Bottle Stickers',
    singular: 'Mini sticker',
    groupId: 'stickers',
    description: 'Small vinyl stickers sized for phone cases, bottles and earbud cases.',
    options: [
      { key: 'size', label: 'Size', values: [{ value: 'XS', label: 'Mini', hint: '1.5 in' }, { value: 'S', label: 'Small', hint: '2 in' }] },
      { key: 'finish', label: 'Finish', values: [{ value: 'matte', label: 'Matte' }, { value: 'glossy', label: 'Glossy' }] },
    ],
    price: { base: 1900, deltas: { size: { XS: 0, S: 500 } } },
    art: 'sticker',
    highlights: ['Waterproof vinyl', 'Sized for phone cases and bottles', 'Counts towards sticker packs'],
    sample: 200,
  },
  {
    id: 'car-bike-stickers',
    name: 'Car & Bike Stickers',
    singular: 'Car & bike sticker',
    groupId: 'stickers',
    description: 'Weatherproof vinyl decals for cars, bikes, helmets and windows.',
    options: [
      { key: 'size', label: 'Size', values: [{ value: 'S', label: 'Small', hint: '6 in' }, { value: 'M', label: 'Medium', hint: '10 in' }, { value: 'L', label: 'Large', hint: '16 in' }] },
      { key: 'finish', label: 'Finish', values: [{ value: 'vinyl', label: 'Weatherproof vinyl' }, { value: 'reflective', label: 'Reflective' }] },
    ],
    price: { base: 9900, deltas: { size: { S: 0, M: 5000, L: 15000 }, finish: { vinyl: 0, reflective: 4000 } } },
    art: 'decal',
    highlights: ['Outdoor-grade, UV-resistant vinyl', 'Handles rain, sun and car washes', 'Easy, bubble-free application'],
    sample: 200,
  },
  {
    id: 'sticker-packs',
    name: 'Sticker Packs',
    singular: 'Sticker pack',
    groupId: 'stickers',
    description: 'Curated packs of themed stickers. The quickest way to cover a laptop.',
    options: [pack('pack', 'Pack size', [['10', '10 stickers'], ['25', '25 stickers'], ['50', '50 stickers']])],
    price: { base: 19900, deltas: { pack: { '10': 0, '25': 20000, '50': 50000 } } },
    art: 'pack',
    highlights: ['A themed mix, no repeats in a pack', 'Waterproof vinyl stickers', 'Great for gifting'],
    sample: 120,
  },
  {
    id: 'wall-posters',
    name: 'Wall Posters',
    singular: 'Wall poster',
    groupId: 'posters',
    description: 'Posters printed on thick 300 GSM paper in A4, A3, A2 and 12 × 18 in.',
    options: [
      POSTER_SIZE,
      { key: 'paper', label: 'Paper', values: [{ value: 'matte', label: 'Matte', hint: '300 GSM' }, { value: 'glossy', label: 'Glossy', hint: '300 GSM' }] },
      {
        key: 'frame',
        label: 'Frame',
        values: [
          { value: 'none', label: 'No frame' },
          { value: 'black', label: 'Black' },
          { value: 'white', label: 'White' },
          { value: 'wood', label: 'Wood' },
        ],
      },
    ],
    price: {
      base: 9900,
      deltas: {
        size: { A4: 0, A3: 5000, A2: 15000, '12x18': 6000 },
        paper: { matte: 0, glossy: 2000 },
        frame: {
          none: 0,
          black: { by: 'size', map: { A4: 20000, A3: 25000, A2: 40000, '12x18': 28000 } },
          white: { by: 'size', map: { A4: 20000, A3: 25000, A2: 40000, '12x18': 28000 } },
          wood: { by: 'size', map: { A4: 25000, A3: 30000, A2: 45000, '12x18': 33000 } },
        },
      },
    },
    art: 'poster',
    highlights: ['Printed on thick 300 GSM paper', 'Rich, fade-resistant colours', 'Shipped flat in a rigid mailer'],
    sample: 900,
  },
  {
    id: 'framed-posters',
    name: 'Framed Posters',
    singular: 'Framed poster',
    groupId: 'posters',
    description: 'Ready-to-hang posters in black, white or wood frames.',
    options: [
      { key: 'size', label: 'Size', values: POSTER_SIZE.values.slice(0, 3) },
      { key: 'frame', label: 'Frame', values: [{ value: 'black', label: 'Black' }, { value: 'white', label: 'White' }, { value: 'wood', label: 'Wood' }] },
    ],
    price: { base: 29900, deltas: { size: { A4: 0, A3: 10000, A2: 35000 }, frame: { black: 0, white: 0, wood: 5000 } } },
    art: 'framed',
    highlights: ['Ready to hang', 'Shatter-resistant acrylic front', 'Packed with corner protectors'],
    sample: 300,
  },
  {
    id: 'split-posters',
    name: 'Split Posters',
    singular: 'Split poster (3 panels)',
    groupId: 'posters',
    description: 'One artwork printed across three panels for a big statement wall.',
    options: [{ key: 'size', label: 'Size', values: [{ value: 'S', label: '3 × A4' }, { value: 'M', label: '3 × A3' }, { value: 'L', label: '3 × A2' }] }],
    price: { base: 29900, deltas: { size: { S: 0, M: 15000, L: 45000 } } },
    art: 'split',
    highlights: ['Three panels that line up into one image', 'Thick 300 GSM paper', 'Spacing guide included'],
    sample: 120,
  },
  {
    id: 'poster-sets',
    name: 'Poster Sets',
    singular: 'Poster set',
    groupId: 'posters',
    description: 'Matching posters designed to hang together.',
    options: [
      pack('pack', 'Set of', [['3', '3 posters'], ['6', '6 posters'], ['9', '9 posters']]),
      { key: 'size', label: 'Size', values: POSTER_SIZE.values.slice(0, 2) },
    ],
    price: { base: 27900, deltas: { pack: { '3': 0, '6': 22000, '9': 40000 }, size: { A4: 0, A3: { by: 'pack', map: { '3': 12000, '6': 22000, '9': 30000 } } } } },
    art: 'poster-set',
    highlights: ['Designs picked to match', 'Thick 300 GSM paper', 'Shipped flat'],
    sample: 100,
  },
  {
    id: 'wall-collage-kits',
    name: 'Wall Collage Kits',
    singular: 'Wall collage kit',
    groupId: 'posters',
    description: 'Bundles of mini prints to build an aesthetic photo wall.',
    options: [pack('pieces', 'Prints', [['30', '30 prints'], ['50', '50 prints'], ['80', '80 prints']])],
    price: { base: 39900, deltas: { pieces: { '30': 0, '50': 20000, '80': 40000 } } },
    art: 'collage',
    highlights: ['Mix-and-match mini prints', 'Matte paper, no glare', 'Packed flat'],
    sample: 60,
  },
  {
    id: 'mini-posters',
    name: 'Mini Posters',
    singular: 'Mini poster set',
    groupId: 'posters',
    description: 'A5 posters for desks, shelves and small walls.',
    options: [pack('pack', 'Set of', [['4', '4 posters'], ['8', '8 posters'], ['12', '12 posters']])],
    price: { base: 14900, deltas: { pack: { '4': 0, '8': 10000, '12': 18000 } } },
    art: 'mini-posters',
    highlights: ['A5 size, 14.8 × 21 cm', 'Thick 300 GSM paper', 'Perfect for desks and shelves'],
    sample: 150,
  },
  {
    id: 'polaroid-sets',
    name: 'Polaroid Sets',
    singular: 'Polaroid set',
    groupId: 'polaroids',
    description: 'Polaroid-style prints with the classic white border, in sets.',
    options: [
      pack('pack', 'Set of', [['10', '10 prints'], ['20', '20 prints'], ['30', '30 prints'], ['50', '50 prints']]),
      { key: 'finish', label: 'Finish', values: [{ value: 'matte', label: 'Matte' }, { value: 'glossy', label: 'Glossy' }] },
    ],
    price: { base: 14900, deltas: { pack: { '10': 0, '20': 10000, '30': 18000, '50': 30000 } } },
    art: 'polaroids',
    highlights: ['Classic polaroid border with space to write', 'Thick photo card', 'Rounded corners'],
    sample: 250,
  },
  {
    id: 'polaroid-wall-kits',
    name: 'Polaroid Wall Kits',
    singular: 'Polaroid wall kit',
    groupId: 'polaroids',
    description: 'Polaroid prints with mini clips and string to hang them on your wall.',
    options: [pack('kit', 'Kit', [['20', '20 prints + clips'], ['40', '40 prints + clips + fairy lights']])],
    price: { base: 39900, deltas: { kit: { '20': 0, '40': 30000 } } },
    art: 'polaroid-kit',
    highlights: ['Wooden mini clips and string included', 'Fairy lights in the bigger kit', 'Ready to hang'],
    sample: 40,
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    singular: 'Bookmark',
    groupId: 'more',
    description: 'Thick, laminated bookmarks for every reader.',
    options: [pack('pack', 'Pack', [['1', '1 bookmark'], ['3', '3 bookmarks'], ['5', '5 bookmarks']])],
    price: { base: 3900, deltas: { pack: { '1': 0, '3': 6000, '5': 9000 } } },
    art: 'bookmark',
    highlights: ['Thick, laminated card', 'Tassel included', 'Printed on both sides'],
    sample: 200,
  },
  {
    id: 'postcards',
    name: 'Postcards',
    singular: 'Postcard',
    groupId: 'more',
    description: 'Art postcards to send, frame or pin up.',
    options: [pack('pack', 'Pack', [['1', '1 postcard'], ['5', '5 postcards'], ['10', '10 postcards']])],
    price: { base: 2900, deltas: { pack: { '1': 0, '5': 8000, '10': 13000 } } },
    art: 'postcard',
    highlights: ['A6 size, 10.5 × 14.8 cm', 'Writable back', 'Thick card stock'],
    sample: 150,
  },
  {
    id: 'keychains',
    name: 'Keychains',
    singular: 'Keychain',
    groupId: 'more',
    description: 'Acrylic keychains printed with your favourite designs.',
    options: [{ key: 'sides', label: 'Print', values: [{ value: 'single', label: 'Single-sided' }, { value: 'double', label: 'Double-sided' }] }],
    price: { base: 14900, deltas: { sides: { single: 0, double: 3000 } } },
    art: 'keychain',
    highlights: ['Clear acrylic, about 5 cm', 'Metal ring and chain', 'Scratch-resistant print'],
    sample: 150,
  },
  {
    id: 'badges',
    name: 'Pin Badges',
    singular: 'Pin badge',
    groupId: 'more',
    description: 'Round metal pin badges for bags, jackets and lanyards.',
    options: [{ key: 'size', label: 'Size', values: [{ value: '44', label: '44 mm' }, { value: '58', label: '58 mm' }] }],
    price: { base: 4900, deltas: { size: { '44': 0, '58': 2000 } } },
    art: 'badge',
    highlights: ['Glossy finish', 'Safety-pin back', 'Fade-resistant print'],
    sample: 150,
  },
  {
    id: 'phone-skins',
    name: 'Phone Skins',
    singular: 'Phone skin',
    groupId: 'more',
    description: 'Full-cover vinyl skins cut to fit your phone model.',
    options: [
      {
        key: 'model',
        label: 'Phone model',
        display: 'select',
        required: true,
        values: [
          'iPhone 16 Pro Max',
          'iPhone 16 Pro',
          'iPhone 16',
          'iPhone 15',
          'Galaxy S25 Ultra',
          'Galaxy S25',
          'Galaxy S24 FE',
          'Pixel 9 Pro',
          'Pixel 9',
          'OnePlus 13',
          'OnePlus Nord 4',
          'Redmi Note 14 Pro',
          'Nothing Phone (3a)',
          'Vivo V40',
          'OPPO Reno 12',
        ].map((m) => ({ value: m.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''), label: m })),
      },
      { key: 'finish', label: 'Finish', values: [{ value: 'matte', label: 'Matte' }, { value: 'glossy', label: 'Glossy' }] },
    ],
    price: { base: 34900 },
    art: 'phone-skin',
    highlights: ['Cut to your exact phone model', 'Bubble-free vinyl', 'Removes without residue'],
    sample: 60,
  },
  {
    id: 'laptop-skins',
    name: 'Laptop Skins',
    singular: 'Laptop skin',
    groupId: 'more',
    description: 'Full-cover vinyl skins for your laptop lid.',
    options: [
      {
        key: 'size',
        label: 'Laptop size',
        values: [
          { value: '13', label: '13 in' },
          { value: '14', label: '14 in' },
          { value: '15.6', label: '15.6 in' },
          { value: '16', label: '16 in' },
        ],
      },
    ],
    price: { base: 44900, deltas: { size: { '13': 0, '14': 0, '15.6': 5000, '16': 5000 } } },
    art: 'laptop-skin',
    highlights: ['Covers the whole lid', 'Trim-to-fit edges', 'Scratch-resistant laminate'],
    sample: 60,
  },

  /* ---------- custom studio (hidden group: priced here, never listed) ---------- */
  {
    id: 'custom-stickers',
    name: 'Custom Stickers',
    singular: 'Custom stickers',
    groupId: 'custom',
    description: 'Your own image printed as waterproof vinyl stickers, cut to the shape you choose.',
    options: [
      pack('pack', 'How many', [['10', '10 stickers'], ['25', '25 stickers'], ['50', '50 stickers'], ['100', '100 stickers']]),
      pack('shape', 'Shape', [['die-cut', 'Die-cut'], ['circle', 'Circle'], ['square', 'Square'], ['rounded', 'Rounded']]),
      STICKER_SIZE,
      {
        key: 'finish',
        label: 'Finish',
        values: [
          { value: 'matte', label: 'Matte' },
          { value: 'glossy', label: 'Glossy' },
          { value: 'holographic', label: 'Holographic' },
          { value: 'transparent', label: 'Transparent' },
        ],
      },
    ],
    price: {
      base: 29900,
      deltas: {
        pack: { '10': 0, '25': 30000, '50': 70000, '100': 120000 },
        size: {
          S: 0,
          M: { by: 'pack', map: { '10': 5000, '25': 10000, '50': 18000, '100': 30000 } },
          L: { by: 'pack', map: { '10': 10000, '25': 20000, '50': 36000, '100': 60000 } },
        },
        finish: {
          matte: 0,
          glossy: 0,
          holographic: { by: 'pack', map: { '10': 10000, '25': 20000, '50': 35000, '100': 60000 } },
          transparent: { by: 'pack', map: { '10': 5000, '25': 10000, '50': 18000, '100': 30000 } },
        },
      },
    },
    art: 'sticker',
    highlights: ['Printed from your own image', 'Waterproof, scratch-resistant vinyl', 'We check every design before printing'],
    sample: 0,
  },
  {
    id: 'custom-polaroids',
    name: 'Custom Polaroids',
    singular: 'Custom polaroids',
    groupId: 'custom',
    description: 'Your photos printed as polaroid-style prints with a white border and your captions.',
    options: [
      pack('pack', 'Set of', [['10', '10 prints'], ['20', '20 prints'], ['30', '30 prints'], ['50', '50 prints']]),
      {
        key: 'size',
        label: 'Size',
        values: [
          { value: 'classic', label: 'Classic', hint: '3.5 × 4.2 in' },
          { value: 'mini', label: 'Mini', hint: '2.1 × 3.4 in' },
        ],
      },
      { key: 'finish', label: 'Finish', values: [{ value: 'matte', label: 'Matte' }, { value: 'glossy', label: 'Glossy' }] },
      {
        key: 'extras',
        label: 'Add-ons',
        values: [
          { value: 'none', label: 'Prints only' },
          { value: 'clips', label: 'Clips + string' },
          { value: 'lights', label: 'Clips + fairy lights' },
        ],
      },
    ],
    price: {
      base: 17900,
      deltas: {
        pack: { '10': 0, '20': 12000, '30': 21000, '50': 35000 },
        size: { classic: 0, mini: { by: 'pack', map: { '10': -4000, '20': -6000, '30': -8000, '50': -12000 } } },
        extras: {
          none: 0,
          clips: { by: 'pack', map: { '10': 4900, '20': 6900, '30': 8900, '50': 12900 } },
          lights: { by: 'pack', map: { '10': 14900, '20': 16900, '30': 18900, '50': 22900 } },
        },
      },
    },
    art: 'polaroids',
    highlights: ['Classic white border with your caption', 'Thick photo card', 'We check every photo before printing'],
    sample: 0,
  },
  {
    id: 'custom-posters',
    name: 'Custom Posters',
    singular: 'Custom poster',
    groupId: 'custom',
    description: 'Your photo or artwork printed as a poster on thick 300 GSM paper, framed or unframed.',
    options: [
      POSTER_SIZE,
      { key: 'paper', label: 'Paper', values: [{ value: 'matte', label: 'Matte', hint: '300 GSM' }, { value: 'glossy', label: 'Glossy', hint: '300 GSM' }] },
      {
        key: 'frame',
        label: 'Frame',
        values: [
          { value: 'none', label: 'No frame' },
          { value: 'black', label: 'Black' },
          { value: 'white', label: 'White' },
          { value: 'wood', label: 'Wood' },
        ],
      },
      pack('orientation', 'Orientation', [['portrait', 'Portrait'], ['landscape', 'Landscape']]),
    ],
    price: {
      base: 11900,
      deltas: {
        size: { A4: 0, A3: 5000, A2: 15000, '12x18': 6000 },
        paper: { matte: 0, glossy: 2000 },
        frame: {
          none: 0,
          black: { by: 'size', map: { A4: 20000, A3: 25000, A2: 40000, '12x18': 28000 } },
          white: { by: 'size', map: { A4: 20000, A3: 25000, A2: 40000, '12x18': 28000 } },
          wood: { by: 'size', map: { A4: 25000, A3: 30000, A2: 45000, '12x18': 33000 } },
        },
      },
    },
    art: 'framed',
    highlights: ['Printed on thick 300 GSM paper', 'Preview on a wall before you order', 'We check every image before printing'],
    sample: 0,
  },
];

export interface VibeDef {
  id: string;
  name: string;
  blurb: string;
  /** Words used to name demo products. */
  nouns: string[];
  /** Short words printed on demo sticker art. */
  words: string[];
  tags: string;
  posters?: PosterKind[];
  /** Relative share of demo products. */
  weight: number;
  featured?: boolean;
}

export const VIBES: VibeDef[] = [
  { id: 'anime', name: 'Anime', blurb: 'Ronins, spirits and late-night shonen energy.', nouns: ['Ronin', 'Kitsune', 'Shinobi', 'Sakura', 'Mecha', 'Spirit Fox', 'Oni Mask', 'Samurai', 'Neko', 'Kaiju', 'Katana', 'Lotus', 'Chibi', 'Dragon', 'Tanuki', 'Sensei'], words: ['SUGOI', 'OTAKU', 'RONIN', 'NEKO', 'KAWAII', 'SENPAI', 'KAIJU', 'NINJA'], tags: 'anime manga otaku japan shonen', posters: ['speed', 'grid', 'orbit'], weight: 9, featured: true },
  { id: 'f1-motorsport', name: 'F1 & Motorsport', blurb: 'Pit lanes, apexes and lights out.', nouns: ['Pit Lane', 'Apex', 'Slipstream', 'Chicane', 'Pole Position', 'Podium', 'Hairpin', 'Overtake', 'Grid Walk', 'Box Box', 'Lap 58', 'Fastest Lap', 'Parc Ferme', 'Sector Three', 'Night Race', 'Full Send'], words: ['PIT LANE', 'APEX', 'DRS', 'P1', 'BOX BOX', 'FULL SEND', 'PODIUM', 'GRID'], tags: 'f1 formula racing motorsport grand prix race car', posters: ['speed', 'grid'], weight: 8, featured: true },
  { id: 'cars-bikes', name: 'Cars & Bikes', blurb: 'Turbo dreams, drift smoke and open roads.', nouns: ['Turbo', 'Drift King', 'Redline', 'Supercharger', 'V8', 'Cafe Racer', 'Scrambler', 'Night Drive', 'Burnout', 'Torque', 'Garage Hero', 'Open Road', 'Throttle', 'Rev Limiter', 'Track Day', 'Boost'], words: ['TURBO', 'DRIFT', 'REDLINE', 'V8', 'VROOM', 'BOOST', 'REV', 'TORQUE'], tags: 'cars bikes jdm drift motorcycle auto', posters: ['speed', 'grid'], weight: 5, featured: true },
  { id: 'cricket', name: 'Cricket', blurb: 'Cover drives, yorkers and last-over drama.', nouns: ['Cover Drive', 'Yorker', 'Helicopter Shot', 'Super Over', 'Powerplay', 'Gully Cricket', 'Golden Duck', 'Straight Six', 'Hat-trick', 'Night Match', 'Leg Spin', 'Free Hit', 'Boundary Line', 'Death Over', 'Stumps', 'Run Chase'], words: ['HOWZAT', 'SIXER', 'YORKER', 'BOUNDARY', 'FREE HIT', 'DUCK', 'CENTURY', 'OUT'], tags: 'cricket ipl bat ball stadium', posters: ['speed', 'sunset', 'grid'], weight: 5, featured: true },
  { id: 'football', name: 'Football', blurb: 'Last-minute winners and Sunday league legends.', nouns: ['Bicycle Kick', 'Golden Boot', 'Stoppage Time', 'Derby Day', 'Free Kick', 'Nutmeg', 'Hat Trick', 'Clean Sheet', 'Top Corner', 'Penalty', 'Away Kit', 'Captain', 'Header', 'Counter Attack', 'Sunday League', 'Final Whistle'], words: ['GOAL', 'NUTMEG', 'DERBY', 'OFFSIDE', 'VAR', 'PENALTY', 'ULTRAS', 'CHAMPS'], tags: 'football soccer goal stadium', posters: ['speed', 'grid'], weight: 3 },
  { id: 'movies', name: 'Movies', blurb: 'Midnight screenings, cult classics and popcorn.', nouns: ['Midnight Screening', 'Plot Twist', 'Final Cut', 'Cult Classic', 'Popcorn', 'Directors Cut', 'Box Office', 'Opening Night', 'Film Reel', 'Credits Roll', 'Silver Screen', 'Sequel', 'Slow Motion', 'Jump Scare', 'Montage', 'Cliffhanger'], words: ['ACTION', 'CUT', 'POPCORN', 'SEQUEL', 'CINEMA', 'SCENE', 'ROLL', 'THE END'], tags: 'movies cinema film hollywood', posters: ['grid', 'sunset', 'orbit'], weight: 4, featured: true },
  { id: 'tv-series', name: 'TV Series', blurb: 'One more episode, then sleep. Probably.', nouns: ['Binge Mode', 'Season Finale', 'Plot Armor', 'Cold Open', 'Next Episode', 'Spoiler Alert', 'Pilot', 'Cliffhanger', 'Recap', 'Mid-Season', 'Theme Song', 'Rewatch', 'Character Arc', 'Showrunner', 'Remote Control', 'Couch Potato'], words: ['BINGE', 'SPOILER', 'NEXT', 'RERUN', 'FINALE', 'SEASON 2', 'RECAP', 'PILOT'], tags: 'tv series shows web series binge', posters: ['grid', 'wave'], weight: 3 },
  { id: 'music', name: 'Music', blurb: 'Vinyl, basslines and headphones on.', nouns: ['Bassline', 'Vinyl Days', 'Headphones On', 'Mixtape', 'Encore', 'B-Side', 'The Drop', 'Backstage', 'Acoustic', 'Lo-fi Beats', 'Soundcheck', 'Amplifier', 'Riff', 'Synth', 'Mosh Pit', 'Jam Session'], words: ['BASS', 'ENCORE', 'LO-FI', 'MIXTAPE', 'VINYL', 'DROP', 'REMIX', 'ON AIR'], tags: 'music band concert vinyl headphones', posters: ['wave', 'grid', 'sunset'], weight: 5, featured: true },
  { id: 'k-pop', name: 'K-Pop', blurb: 'Light sticks up, bias forever.', nouns: ['Bias', 'Light Stick', 'Comeback', 'Fanchant', 'Maknae', 'Photocard', 'Stan Mode', 'Encore Stage', 'Dance Break', 'Fancam', 'New Era', 'Debut', 'Concert Night', 'Album Drop', 'Idol', 'Sold Out'], words: ['SARANGHAE', 'BIAS', 'STAN', 'COMEBACK', 'FIGHTING', 'DEBUT', 'ENCORE', 'HWAITING'], tags: 'kpop k-pop korean idol', posters: ['bloom', 'wave', 'grid'], weight: 5, featured: true },
  { id: 'gaming', name: 'Gaming', blurb: 'Respawn, level up, one more match.', nouns: ['Respawn', 'Level Up', 'Final Boss', 'Speedrun', 'Headshot', 'Loot Drop', 'Game Over', 'Side Quest', 'Pixel Hero', 'Combo', 'Clutch', 'Noob', 'Lag Spike', 'Rage Quit', 'Save Point', 'Critical Hit'], words: ['GG', 'AFK', 'RESPAWN', 'LEVEL UP', 'CLUTCH', 'NOOB', 'GAME OVER', '1UP'], tags: 'gaming gamer esports console pc', posters: ['grid', 'speed', 'orbit'], weight: 6, featured: true },
  { id: 'superheroes', name: 'Superheroes', blurb: 'Capes, masks and secret identities.', nouns: ['Night Guardian', 'Secret Identity', 'Power Surge', 'Origin Story', 'Masked Vigilante', 'Hero Landing', 'Sidekick', 'Super Strength', 'Laser Eyes', 'Arch Nemesis', 'City Watch', 'Thunder Fist', 'Shield Bearer', 'Lightning Dash', 'Cape Season', 'Comic Panel'], words: ['POW', 'BAM', 'ZAP', 'KAPOW', 'HERO', 'WHAM', 'BOOM', 'SMASH'], tags: 'superhero hero comic comics', posters: ['speed', 'grid', 'orbit'], weight: 4 },
  { id: 'bollywood', name: 'Bollywood', blurb: 'Filmy dialogues, dance breaks and drama.', nouns: ['Filmy', 'Masala', 'Interval', 'Climax Scene', 'Hero Entry', 'Slow Motion', 'Dhamaka', 'Superstar', 'Item Song', 'Dance Break', 'Box Office Hit', 'Dialogue Baazi', 'Picture Perfect', 'Starstruck', 'Retro Romance', 'Blockbuster'], words: ['FILMY', 'DHAMAKA', 'DRAMA', 'MASALA', 'PICTURE', 'HERO', 'ENTRY', 'HIT'], tags: 'bollywood hindi films desi filmy', posters: ['sunset', 'grid', 'bloom'], weight: 4, featured: true },
  { id: 'memes', name: 'Memes', blurb: 'Inside jokes for the group chat.', nouns: ['Main Character', 'Not Today', 'Big Mood', 'Error 404', 'Low Battery', 'Ctrl Alt Chill', 'Overthinker', 'Snack Break', 'Delulu', 'No Thoughts', 'Sleep Mode', 'Bruh Moment', 'Brain Lag', 'Vibe Check', 'Touch Grass', 'Side Eye'], words: ['BRUH', 'DELULU', 'NPC', '404', 'MOOD', 'YOLO', 'LOL', 'VIBE CHECK'], tags: 'memes funny meme humour', posters: ['grid', 'wave'], weight: 6, featured: true },
  { id: 'quotes', name: 'Quotes & Motivation', blurb: 'Small reminders for big days.', nouns: ['Do It Scared', 'Rise and Grind', 'Stay Curious', 'One Day at a Time', 'Keep Going', 'Make It Happen', 'Small Steps', 'Dream Big', 'Choose Joy', 'Hustle Hard', 'Be Kind', 'Trust the Process', 'Progress Over Perfection', 'Good Things Take Time', 'You Got This', 'Stay Humble'], words: ['HUSTLE', 'DREAM', 'BELIEVE', 'FOCUS', 'KEEP GOING', 'GRIND', 'RISE', 'BE KIND'], tags: 'quotes motivation motivational typography', posters: ['wave', 'sunset', 'bloom'], weight: 6, featured: true },
  { id: 'aesthetic', name: 'Aesthetic', blurb: 'Soft light, sunsets and dreamy colours.', nouns: ['Golden Hour', 'Lavender Sky', 'Soft Launch', 'Cloud Nine', 'Daydream', 'Sunset Club', 'Moonlit', 'Pastel Sky', 'Dreamscape', 'Slow Morning', 'Rose Quartz', 'Film Grain', 'Velvet Night', 'Honey Glow', 'Sea Breeze', 'Stardust'], words: ['DREAMY', 'GLOW', 'SOFT', 'AURA', 'BLISS', 'CALM', 'HALO', 'SERENE'], tags: 'aesthetic dreamy pastel sunset', posters: ['sunset', 'wave', 'bloom'], weight: 7, featured: true },
  { id: 'cute-kawaii', name: 'Cute & Kawaii', blurb: 'Tiny, fluffy and impossibly sweet.', nouns: ['Boba Buddy', 'Mochi', 'Cloud Cat', 'Sleepy Bear', 'Bunny Hop', 'Peach Fuzz', 'Little Ghost', 'Strawberry Milk', 'Happy Toast', 'Cupcake', 'Panda Hug', 'Frog Prince', 'Duckling', 'Marshmallow', 'Sprinkles', 'Sunny Side Up'], words: ['CUTE', 'UWU', 'MOCHI', 'BOBA', 'YAY', 'HUGS', 'BOOP', 'AWW'], tags: 'cute kawaii adorable', posters: ['bloom', 'wave'], weight: 5, featured: true },
  { id: 'nature-travel', name: 'Nature & Travel', blurb: 'Mountains, monsoons and long road trips.', nouns: ['Mountain Air', 'Monsoon', 'Road Trip', 'Wanderlust', 'Camp Fire', 'Forest Trail', 'Sea Breeze', 'Backpacker', 'Hill Station', 'Night Sky', 'Waterfall', 'Desert Dunes', 'Tea Garden', 'Sunrise Trek', 'Lake Side', 'Wild Trails'], words: ['EXPLORE', 'WANDER', 'HIKE', 'ROAM', 'TREK', 'CAMP', 'GO', 'OUTSIDE'], tags: 'nature travel mountains trek wanderlust', posters: ['sunset', 'wave'], weight: 4 },
  { id: 'space', name: 'Space', blurb: 'Planets, rockets and zero gravity.', nouns: ['Zero Gravity', 'Moon Base', 'Orbit', 'Supernova', 'Nebula', 'Rocket Launch', 'Black Hole', 'Star Map', 'Comet', 'Astronaut', 'Galaxy Brain', 'Saturn Rings', 'Mission Control', 'Lunar Eclipse', 'Cosmic Dust', 'Light Year'], words: ['ORBIT', 'NOVA', 'COSMOS', 'LAUNCH', 'ROCKET', 'SPACE', 'MOON', 'STAR'], tags: 'space planets galaxy astronaut rocket', posters: ['orbit', 'grid'], weight: 5, featured: true },
  { id: 'coding-tech', name: 'Coding & Tech', blurb: 'Ship it, debug it, ship it again.', nouns: ['Chai Over Code', 'Works on My Machine', 'Merge Conflict', 'Dark Mode', 'Hello World', 'Infinite Loop', 'Ship It', 'Null Pointer', 'Debug Mode', 'Root Access', 'Commit Message', 'Ctrl Z', 'Byte Size', 'Kernel Panic', 'Syntax Error', 'Late Night Deploy'], words: ['SUDO', 'DEBUG', 'GIT PUSH', '404', 'CHAI.EXE', 'DEPLOY', 'HELLO', 'NULL'], tags: 'coding programming developer tech engineer', posters: ['grid', 'orbit'], weight: 5, featured: true },
  { id: 'spiritual', name: 'Spiritual', blurb: 'Calm minds, mantras and good karma.', nouns: ['Om Shanti', 'Good Karma', 'Inner Peace', 'Third Eye', 'Lotus Bloom', 'Chakra', 'Mantra', 'Namaste', 'Zen Mode', 'Mandala', 'Sacred Geometry', 'Moon Ritual', 'Gratitude', 'Mindful', 'Aura', 'Healing Light'], words: ['OM', 'ZEN', 'KARMA', 'NAMASTE', 'PEACE', 'BREATHE', 'SHANTI', 'MANTRA'], tags: 'spiritual zen yoga mandala calm', posters: ['bloom', 'orbit'], weight: 3 },
  { id: 'desi-vibes', name: 'Desi Vibes', blurb: 'Chai, jugaad and full desi swag.', nouns: ['Chai Lover', 'Jugaad', 'Desi Swag', 'Bindaas', 'Masala Chai', 'Auto Rickshaw', 'Paisa Vasool', 'Full Filmy', 'Mumbai Local', 'Dilli Winter', 'Monsoon Pakoras', 'Shaadi Season', 'Cutting Chai', 'Thali Time', 'Mehendi', 'Gully Swag'], words: ['CHAI', 'JUGAAD', 'BINDAAS', 'PAKKA', 'YAAR', 'DESI', 'ARRE', 'SAHI'], tags: 'desi india indian hindi chai', posters: ['sunset', 'bloom', 'grid'], weight: 6, featured: true },
  { id: 'pets', name: 'Pets', blurb: 'Paws, purrs and very good boys.', nouns: ['Good Boy', 'Cat Nap', 'Paw Print', 'Puppy Love', 'Indie Dog', 'Whiskers', 'Fur Baby', 'Zoomies', 'Belly Rub', 'Treat Time', 'Lazy Cat', 'Walkies', 'Bark Mode', 'Meow Club', 'Pet Parent', 'Tail Wag'], words: ['WOOF', 'MEOW', 'BORK', 'PAWS', 'ZOOMIES', 'PURR', 'GOOD BOY', 'TREATS'], tags: 'pets dog cat puppy kitten', posters: ['bloom', 'wave'], weight: 4 },
  { id: 'food', name: 'Food', blurb: 'Pizza, momos and late-night snack runs.', nouns: ['Momo Lover', 'Pizza Night', 'Biryani Club', 'Vada Pav', 'Chai Biscuit', 'Pani Puri', 'Late Night Snack', 'Butter Chicken', 'Dosa Day', 'Ice Gola', 'Mango Season', 'Street Food', 'Samosa Party', 'Noodle Bowl', 'Filter Coffee', 'Sweet Tooth'], words: ['YUM', 'MOMO', 'PIZZA', 'BIRYANI', 'SNACK', 'FOODIE', 'CHAAT', 'DOSA'], tags: 'food foodie snacks street food', posters: ['sunset', 'wave'], weight: 3 },
  { id: 'retro-vintage', name: 'Retro & Vintage', blurb: 'Cassettes, film cameras and old-school cool.', nouns: ['Cassette', 'Film Camera', 'Arcade Night', 'Disco Ball', 'Polaroid Days', 'Retro Wave', 'VHS Tape', 'Jukebox', 'Roller Disco', 'Neon Diner', 'Old School', 'Rotary Phone', 'Typewriter', 'Boombox', 'Vintage Ride', 'Flashback'], words: ['RETRO', 'RAD', 'DISCO', 'VHS', 'GROOVY', '1985', 'ARCADE', 'FAR OUT'], tags: 'retro vintage 80s 90s nostalgia', posters: ['grid', 'sunset'], weight: 4 },
  { id: 'minimal', name: 'Minimal', blurb: 'Clean lines and quiet shapes.', nouns: ['Less Is More', 'Line Art', 'Monochrome', 'Simple Things', 'Negative Space', 'Balance', 'Still Life', 'Clean Slate', 'Form', 'Grid', 'Contour', 'Silence', 'Shape Study', 'One Line', 'Calm', 'Mono'], words: ['LESS', 'CALM', 'SIMPLE', 'MONO', 'LINE', 'FORM', 'STILL', 'QUIET'], tags: 'minimal minimalist line art simple', posters: ['wave', 'orbit'], weight: 3 },
  { id: 'love', name: 'Love & Couples', blurb: 'Matching stickers for your favourite person.', nouns: ['Soulmate', 'Forever Yours', 'Love Letter', 'Butterflies', 'Heartbeat', 'Better Together', 'Hold My Hand', 'Crush', 'Date Night', 'Sweetheart', 'You and Me', 'Love Bug', 'Pinky Promise', 'First Dance', 'Lovestruck', 'Always'], words: ['LOVE', 'XOXO', 'CRUSH', 'BAE', 'MINE', 'FOREVER', 'HUGS', 'SOULMATE'], tags: 'love couple romantic valentine gift', posters: ['bloom', 'sunset'], weight: 4 },
  { id: 'zodiac', name: 'Zodiac', blurb: 'Written in the stars.', nouns: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Rising Sign', 'Moon Sign', 'Star Chart', 'Retrograde'], words: ['ARIES', 'LEO', 'VIRGO', 'LIBRA', 'GEMINI', 'PISCES', 'SCORPIO', 'TAURUS'], tags: 'zodiac astrology horoscope stars', posters: ['orbit', 'bloom'], weight: 3 },
  { id: 'festivals', name: 'Festivals', blurb: 'Diwali lights, Holi colours and Eid nights.', nouns: ['Diwali Lights', 'Holi Colours', 'Eid Mubarak', 'Rakhi', 'Navratri Nights', 'Garba', 'Christmas Eve', 'Onam', 'Pongal', 'Lohri Fire', 'Durga Puja', 'Ganesh Utsav', 'Baisakhi', 'Kite Festival', 'Festive Season', 'New Year'], words: ['DIWALI', 'HOLI', 'EID', 'GARBA', 'DHOL', 'LIGHTS', 'FESTIVE', 'JOY'], tags: 'festival festive diwali holi eid celebration', posters: ['bloom', 'sunset', 'orbit'], weight: 3 },
  { id: 'fitness', name: 'Fitness', blurb: 'Gym days, rest days and protein shakes.', nouns: ['Leg Day', 'Gym Rat', 'Beast Mode', 'Rest Day', 'Protein Shake', 'Personal Best', 'Early Run', 'Iron Club', 'No Excuses', 'Deadlift', 'Yoga Flow', 'Cardio', 'Sweat Equity', 'Push Day', 'Marathon', 'Strong Era'], words: ['LIFT', 'BEAST', 'SWEAT', 'GAINS', 'RUN', 'FLEX', 'NO EXCUSES', 'PR'], tags: 'fitness gym workout running yoga', posters: ['speed', 'grid'], weight: 3 },
  { id: 'books', name: 'Books & Reading', blurb: 'One more chapter, always.', nouns: ['Bookworm', 'One More Chapter', 'Plot Twist', 'Library Card', 'Book Club', 'Night Reader', 'Paper Cuts', 'Dog Ear', 'Shelf Life', 'Story Time', 'Page Turner', 'Annotated', 'TBR Pile', 'Reading Nook', 'Ink Stains', 'Fiction Lover'], words: ['READ', 'BOOKISH', 'TBR', 'CHAPTER', 'LIT', 'STORY', 'NERD', 'SHH'], tags: 'books reading bookworm library', posters: ['wave', 'bloom'], weight: 3 },
];

export const NAME_ADJECTIVES = [
  'Midnight', 'Neon', 'Cosmic', 'Electric', 'Golden', 'Velvet', 'Retro', 'Lunar', 'Solar', 'Crimson',
  'Cyber', 'Wild', 'Silent', 'Lucky', 'Sunset', 'Monsoon', 'Urban', 'Pastel', 'Infinite', 'Turbo',
  'Vintage', 'Dreamy', 'Savage', 'Chill', 'Glitch', 'Hyper', 'Mystic', 'Royal', 'Burning', 'Frozen',
  'Hidden', 'Little', 'Rebel', 'Lost', 'Sonic', 'Rapid', 'Bold', 'Brave', 'Static', 'Ultra',
];

export const NAME_SUFFIXES = ['Club', 'Mode', 'Energy', 'Era', 'Season', 'Society', 'Diaries', 'Edition', 'Squad', 'Vibes', 'Nights', 'Forever', 'Gang', 'Theory', 'Saga'];
