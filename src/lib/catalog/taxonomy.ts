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
        ],
      },
    ],
    price: { base: 2900, deltas: { size: { S: 0, M: 1000, L: 2000 }, finish: { matte: 0, glossy: 0 } } },
    art: 'sticker',
    highlights: ['Waterproof, scratch-resistant vinyl', 'Die-cut to shape with a clean border', 'Peels off laptops and bottles cleanly'],
    sample: 1200,
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
        finish: { matte: 0, glossy: 0 },
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
  { id: 'humor', name: 'Humor', blurb: 'Inside jokes, sarcasm and group-chat gold.', nouns: ['Main Character', 'Not Today', 'Big Mood', 'Error 404', 'Low Battery', 'Overthinker', 'Delulu', 'Sleep Mode', 'Bruh Moment', 'Brain Lag', 'Vibe Check', 'Touch Grass', 'Side Eye', 'Sarcasm Loading', 'Professional Napper', 'Chaos Coordinator', 'Running on Chai', 'Mentally on Leave', 'Snack Break', 'Ctrl Alt Chill'], words: ['BRUH', 'LOL', 'NOPE', 'MEH', 'DELULU', 'NPC', 'OOPS', 'SUS'], tags: 'humor funny memes meme jokes sarcasm', posters: ['grid', 'wave'], weight: 12, featured: true },
  { id: 'hustle', name: 'Hustle', blurb: 'Grind days, gym days and big plans.', nouns: ['Rise and Grind', 'Boss Mode', 'Hustle Hard', 'Empire Builder', 'Side Hustle', 'Money Mindset', 'No Days Off', 'Beast Mode', 'Leg Day', 'Gym Rat', 'Early Bird', 'CEO Energy', 'Deadline Mode', 'Built Different', 'Stay Hungry', 'Grind Season', 'Personal Best', 'Iron Club'], words: ['HUSTLE', 'GRIND', 'BOSS', 'NO DAYS OFF', 'FOCUS', 'BEAST', 'CEO', 'LIFT'], tags: 'hustle grind motivation gym fitness boss entrepreneur', posters: ['speed', 'grid'], weight: 9, featured: true },
  { id: 'anime', name: 'Anime', blurb: 'Ronins, spirits and late-night shonen energy.', nouns: ['Ronin', 'Kitsune', 'Shinobi', 'Sakura', 'Mecha', 'Spirit Fox', 'Oni Mask', 'Samurai', 'Neko', 'Kaiju', 'Katana', 'Lotus', 'Chibi', 'Dragon', 'Tanuki', 'Sensei'], words: ['SUGOI', 'OTAKU', 'RONIN', 'NEKO', 'KAWAII', 'SENPAI', 'KAIJU', 'NINJA'], tags: 'anime manga otaku japan shonen', posters: ['speed', 'grid', 'orbit'], weight: 8, featured: true },
  { id: 'pop-culture', name: 'Pop Culture', blurb: 'Movies, shows, music fandoms and plot twists.', nouns: ['Plot Twist', 'Midnight Screening', 'Cult Classic', 'Popcorn', 'Binge Mode', 'Season Finale', 'Spoiler Alert', 'Cliffhanger', 'Light Stick', 'Comeback', 'Fancam', 'Masked Vigilante', 'Origin Story', 'Filmy', 'Interval', 'Box Office', 'Red Carpet', 'Fan Club'], words: ['ACTION', 'SPOILER', 'BINGE', 'POPCORN', 'STAN', 'POW', 'ENCORE', 'THE END'], tags: 'pop culture movies cinema tv series shows kpop bollywood superhero fandom', posters: ['grid', 'sunset', 'orbit'], weight: 7, featured: true },
  { id: 'cars-bikes', name: 'Cars & Bikes', blurb: 'Turbo dreams, drift smoke and open roads.', nouns: ['Turbo', 'Drift King', 'Redline', 'Supercharger', 'V8', 'Cafe Racer', 'Scrambler', 'Night Drive', 'Burnout', 'Torque', 'Garage Hero', 'Open Road', 'Throttle', 'Rev Limiter', 'Track Day', 'Boost'], words: ['TURBO', 'DRIFT', 'REDLINE', 'V8', 'VROOM', 'BOOST', 'REV', 'TORQUE'], tags: 'cars bikes motorcycle auto racing drift', posters: ['speed', 'grid'], weight: 6, featured: true },
  { id: 'travel', name: 'Travel', blurb: 'Mountains, beaches and long road trips.', nouns: ['Road Trip', 'Wanderlust', 'Mountain Air', 'Passport Stamp', 'Window Seat', 'Backpacker', 'Hill Station', 'Beach Bum', 'Camp Fire', 'Sunrise Trek', 'Night Train', 'Desert Dunes', 'Monsoon Drive', 'Lake Side', 'Tea Garden', 'Wild Trails'], words: ['EXPLORE', 'WANDER', 'ROAM', 'TREK', 'GO', 'ADVENTURE', 'OUTSIDE', 'TRAVEL'], tags: 'travel nature mountains beach trek wanderlust road trip', posters: ['sunset', 'wave'], weight: 5 },
  { id: 'spiritual', name: 'Spiritual', blurb: 'Calm minds, mantras and good karma.', nouns: ['Om Shanti', 'Good Karma', 'Inner Peace', 'Third Eye', 'Lotus Bloom', 'Chakra', 'Mantra', 'Namaste', 'Zen Mode', 'Mandala', 'Sacred Geometry', 'Moon Ritual', 'Gratitude', 'Mindful', 'Star Chart', 'Healing Light'], words: ['OM', 'ZEN', 'KARMA', 'NAMASTE', 'PEACE', 'BREATHE', 'SHANTI', 'MANTRA'], tags: 'spiritual zen yoga mandala calm zodiac astrology', posters: ['bloom', 'orbit'], weight: 5, featured: true },
  { id: 'desi', name: 'Desi', blurb: 'Chai, jugaad, festivals and full desi swag.', nouns: ['Chai Lover', 'Jugaad', 'Desi Swag', 'Bindaas', 'Masala Chai', 'Auto Rickshaw', 'Paisa Vasool', 'Mumbai Local', 'Dilli Winter', 'Monsoon Pakoras', 'Shaadi Season', 'Cutting Chai', 'Diwali Lights', 'Holi Colours', 'Garba Night', 'Gully Swag'], words: ['CHAI', 'JUGAAD', 'BINDAAS', 'PAKKA', 'YAAR', 'DESI', 'ARRE', 'SAHI'], tags: 'desi india indian hindi chai festival diwali holi', posters: ['sunset', 'bloom', 'grid'], weight: 5, featured: true },
  { id: 'dark-edgy', name: 'Dark & Edgy', blurb: 'Skulls, shadows and a little chaos.', nouns: ['Skull Club', 'Dead Inside', 'Night Crawler', 'Black Rose', 'Grim Smile', 'Void Walker', 'Bad Omen', 'Raven', 'Chaos Theory', 'Thorn Crown', 'Midnight Ritual', 'Snake Eyes', 'Shadow Self', 'No Mercy', 'Hex Mark', 'Lost Soul'], words: ['VOID', 'CHAOS', 'DOOM', 'RIP', 'NOPE', 'GRIM', 'HEX', 'DARK'], tags: 'dark edgy gothic skull grunge horror', posters: ['grid', 'orbit'], weight: 4 },
  { id: 'gaming', name: 'Gaming', blurb: 'Respawn, level up, one more match.', nouns: ['Respawn', 'Level Up', 'Final Boss', 'Speedrun', 'Headshot', 'Loot Drop', 'Game Over', 'Side Quest', 'Pixel Hero', 'Combo', 'Clutch', 'Noob', 'Lag Spike', 'Rage Quit', 'Save Point', 'Critical Hit'], words: ['GG', 'AFK', 'RESPAWN', 'LEVEL UP', 'CLUTCH', 'NOOB', 'GAME OVER', '1UP'], tags: 'gaming gamer esports console pc', posters: ['grid', 'speed', 'orbit'], weight: 3, featured: true },
  { id: 'sports', name: 'Sports', blurb: 'Cricket, football, racing and last-over drama.', nouns: ['Cover Drive', 'Yorker', 'Super Over', 'Gully Cricket', 'Straight Six', 'Run Chase', 'Bicycle Kick', 'Stoppage Time', 'Derby Day', 'Top Corner', 'Final Whistle', 'Pit Lane', 'Apex', 'Pole Position', 'Fastest Lap', 'Night Race'], words: ['HOWZAT', 'SIXER', 'GOAL', 'NUTMEG', 'APEX', 'BOX BOX', 'PODIUM', 'CHAMPS'], tags: 'sports cricket ipl football soccer f1 formula racing motorsport', posters: ['speed', 'grid', 'sunset'], weight: 4 },
  { id: 'tech-code', name: 'Tech & Code', blurb: 'Ship it, debug it, ship it again.', nouns: ['Chai Over Code', 'Works on My Machine', 'Merge Conflict', 'Dark Mode', 'Hello World', 'Infinite Loop', 'Ship It', 'Null Pointer', 'Debug Mode', 'Root Access', 'Commit Message', 'Ctrl Z', 'Byte Size', 'Kernel Panic', 'Syntax Error', 'Late Night Deploy'], words: ['SUDO', 'DEBUG', 'GIT PUSH', '404', 'CHAI.EXE', 'DEPLOY', 'HELLO', 'NULL'], tags: 'tech coding programming developer engineer computer', posters: ['grid', 'orbit'], weight: 4 },
  { id: 'space', name: 'Space', blurb: 'Planets, rockets and zero gravity.', nouns: ['Zero Gravity', 'Moon Base', 'Orbit', 'Supernova', 'Nebula', 'Rocket Launch', 'Black Hole', 'Star Map', 'Comet', 'Astronaut', 'Galaxy Brain', 'Saturn Rings', 'Mission Control', 'Lunar Eclipse', 'Cosmic Dust', 'Light Year'], words: ['ORBIT', 'NOVA', 'COSMOS', 'LAUNCH', 'ROCKET', 'SPACE', 'MOON', 'STAR'], tags: 'space planets galaxy astronaut rocket', posters: ['orbit', 'grid'], weight: 3 },
  { id: 'love', name: 'Love', blurb: 'Matching stickers for your favourite person.', nouns: ['Soulmate', 'Forever Yours', 'Love Letter', 'Butterflies', 'Heartbeat', 'Better Together', 'Hold My Hand', 'Crush', 'Date Night', 'Sweetheart', 'You and Me', 'Love Bug', 'Pinky Promise', 'First Dance', 'Lovestruck', 'Always'], words: ['LOVE', 'XOXO', 'CRUSH', 'BAE', 'MINE', 'FOREVER', 'HUGS', 'SOULMATE'], tags: 'love couple romantic valentine gift', posters: ['bloom', 'sunset'], weight: 3 },
  { id: 'animals', name: 'Animals', blurb: 'Paws, purrs and very good boys.', nouns: ['Good Boy', 'Cat Nap', 'Indie Dog', 'Zoomies', 'Sleepy Panda', 'Red Panda', 'Tiger Stripes', 'Baby Elephant', 'Night Owl', 'Frog Prince', 'Bunny Hop', 'Peacock Pride', 'Lazy Sloth', 'Penguin Waddle', 'Fox Trot', 'Duckling'], words: ['WOOF', 'MEOW', 'PAWS', 'ROAR', 'HOOT', 'BOOP', 'PURR', 'QUACK'], tags: 'animals pets dog cat cute kawaii wildlife', posters: ['bloom', 'wave'], weight: 3 },
  { id: 'food', name: 'Food', blurb: 'Pizza, momos and late-night snack runs.', nouns: ['Momo Lover', 'Pizza Night', 'Biryani Club', 'Vada Pav', 'Chai Biscuit', 'Pani Puri', 'Late Night Snack', 'Butter Chicken', 'Dosa Day', 'Ice Gola', 'Mango Season', 'Street Food', 'Samosa Party', 'Noodle Bowl', 'Filter Coffee', 'Sweet Tooth'], words: ['YUM', 'MOMO', 'PIZZA', 'BIRYANI', 'SNACK', 'FOODIE', 'CHAAT', 'DOSA'], tags: 'food foodie snacks street food', posters: ['sunset', 'wave'], weight: 3 },
  { id: 'music', name: 'Music', blurb: 'Vinyl, basslines and headphones on.', nouns: ['Bassline', 'Vinyl Days', 'Headphones On', 'Mixtape', 'Encore', 'B-Side', 'The Drop', 'Backstage', 'Acoustic', 'Lo-fi Beats', 'Soundcheck', 'Amplifier', 'Riff', 'Synth', 'Mosh Pit', 'Jam Session'], words: ['BASS', 'ENCORE', 'LO-FI', 'MIXTAPE', 'VINYL', 'DROP', 'REMIX', 'ON AIR'], tags: 'music band concert vinyl headphones', posters: ['wave', 'grid', 'sunset'], weight: 2 },
  { id: 'warning-signs', name: 'Warning Signs', blurb: 'Caution: may contain sarcasm.', nouns: ['Caution Hot Mess', 'Danger Zone', 'Do Not Disturb', 'Low Battery Human', 'Beware of Overthinker', 'High Voltage', 'Fragile Ego', 'Caffeine Required', 'Staff Only', 'Slippery Mood', 'Mind the Gap', 'Under Construction', 'No Entry', 'Hard Hat Zone', 'Handle With Care', 'Wet Paint'], words: ['CAUTION', 'DANGER', 'WARNING', 'KEEP OUT', 'FRAGILE', 'HIGH VOLTAGE', 'NO ENTRY', 'BEWARE'], tags: 'warning signs caution danger funny signs', posters: ['grid', 'speed'], weight: 3 },
  { id: 'jdm', name: 'JDM', blurb: 'Touge runs, pop-up lights and midnight highways.', nouns: ['Touge Run', 'Pop-up Lights', 'Rotary Heart', 'Midnight Highway', 'Drift Spec', 'Kanji Decal', 'Street Tuned', 'Stance Nation', 'Camber Life', 'Night Meet', 'Mountain Pass', 'Hatch Life', 'Wide Body', 'Boost Gauge', 'Shift Light', 'Garage Built'], words: ['JDM', 'TOUGE', 'DRIFT', 'STANCE', 'BOOST', 'KAIDO', 'TUNED', 'SLAMMED'], tags: 'jdm japanese cars tuner drift stance touge', posters: ['speed', 'grid'], weight: 2 },
  { id: 'abstract', name: 'Abstract', blurb: 'Shapes, gradients and quiet lines.', nouns: ['Golden Hour', 'Line Art', 'Negative Space', 'Shape Study', 'Fluid Form', 'Colour Field', 'Wavy Lines', 'Gradient Dream', 'Block Shapes', 'Retro Wave', 'Terrazzo', 'Liquid Chrome', 'Moonlit', 'Pastel Sky', 'Prism', 'Orbit Lines'], words: ['FLOW', 'FORM', 'AURA', 'WAVE', 'GLOW', 'PRISM', 'ECHO', 'DRIFT'], tags: 'abstract aesthetic minimal retro geometric pastel', posters: ['wave', 'orbit', 'bloom'], weight: 3 },
  { id: 'quotes', name: 'Quotes', blurb: 'Small reminders for big days.', nouns: ['Do It Scared', 'Stay Curious', 'One Day at a Time', 'Keep Going', 'Make It Happen', 'Small Steps', 'Dream Big', 'Choose Joy', 'Be Kind', 'Trust the Process', 'Progress Over Perfection', 'Good Things Take Time', 'You Got This', 'Stay Humble', 'One More Chapter', 'Bookworm'], words: ['DREAM', 'BELIEVE', 'FOCUS', 'KEEP GOING', 'RISE', 'BE KIND', 'HOPE', 'READ'], tags: 'quotes motivation motivational typography books reading', posters: ['wave', 'sunset', 'bloom'], weight: 3 },
];

/**
 * Where products from earlier themes go when the store moves to the themes above
 * (the one-time store update in scripts/seed.ts). Themes kept as they are aren't listed.
 */
export const VIBE_MOVES: Record<string, string> = {
  'f1-motorsport': 'sports',
  cricket: 'sports',
  football: 'sports',
  fitness: 'hustle',
  movies: 'pop-culture',
  'tv-series': 'pop-culture',
  'k-pop': 'pop-culture',
  superheroes: 'pop-culture',
  bollywood: 'pop-culture',
  memes: 'humor',
  aesthetic: 'abstract',
  minimal: 'abstract',
  'retro-vintage': 'abstract',
  'cute-kawaii': 'animals',
  pets: 'animals',
  zodiac: 'spiritual',
  festivals: 'desi',
  'desi-vibes': 'desi',
  books: 'quotes',
  'nature-travel': 'travel',
  'coding-tech': 'tech-code',
};

/** Product types the store no longer sells (the one-time store update removes them). */
export const RETIRED_TYPES = ['fridge-magnets', 'holographic-stickers', 'transparent-stickers', '3d-motion-stickers', '3d-dome-stickers', 'keychains', 'badges'];

export const NAME_ADJECTIVES = [
  'Midnight', 'Neon', 'Cosmic', 'Electric', 'Golden', 'Velvet', 'Retro', 'Lunar', 'Solar', 'Crimson',
  'Cyber', 'Wild', 'Silent', 'Lucky', 'Sunset', 'Monsoon', 'Urban', 'Pastel', 'Infinite', 'Turbo',
  'Vintage', 'Dreamy', 'Savage', 'Chill', 'Glitch', 'Hyper', 'Mystic', 'Royal', 'Burning', 'Frozen',
  'Hidden', 'Little', 'Rebel', 'Lost', 'Sonic', 'Rapid', 'Bold', 'Brave', 'Static', 'Ultra',
];

export const NAME_SUFFIXES = ['Club', 'Mode', 'Energy', 'Era', 'Season', 'Society', 'Diaries', 'Edition', 'Squad', 'Vibes', 'Nights', 'Forever', 'Gang', 'Theory', 'Saga'];
