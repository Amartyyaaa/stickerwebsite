/**
 * Simple symbols that give each theme's demo designs something to show besides a word: a rocket for
 * Space, a chai glass for Desi, a warning sign for Warning Signs. All are drawn here from basic shapes,
 * in a 100 × 100 box, in one colour (`c`), with `bg` used for small cut-out details. They're generic
 * objects, not characters, logos or anyone else's artwork.
 */

export const MOTIFS = [
  'skull',
  'rocket',
  'planet',
  'torii',
  'katana',
  'mountain',
  'palm',
  'sun',
  'lotus',
  'diya',
  'chai',
  'pizza',
  'popcorn',
  'controller',
  'cricket',
  'football',
  'note',
  'headphones',
  'car',
  'gauge',
  'paw',
  'heart',
  'warning',
  'bolt',
  'dumbbell',
  'crown',
  'laugh',
  'clapper',
  'code',
  'quote',
  'spiral',
  'waves',
] as const;

export type Motif = (typeof MOTIFS)[number];

const f1 = (n: number) => Math.round(n * 10) / 10;
/** A full circle as path commands (for holes cut with fill-rule="evenodd"). */
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
const line = (d: string, c: string, w: number) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const DRAW: Record<Motif, (c: string, bg: string) => string> = {
  skull: (c) =>
    `<path fill="${c}" fill-rule="evenodd" d="M50 8 C28 8 14 24 14 44 C14 56 20 64 28 68 L28 82 C28 86 31 88 34 88 L66 88 C69 88 72 86 72 82 L72 68 C80 64 86 56 86 44 C86 24 72 8 50 8 Z ${ring(36, 47, 9)} ${ring(64, 47, 9)} M50 58 L44 69 L56 69 Z M40 76 H45 V88 H40 Z M47.5 76 H52.5 V88 H47.5 Z M55 76 H60 V88 H55 Z"/>`,
  rocket: (c) =>
    `<g fill="${c}"><path fill-rule="evenodd" d="M50 6 C64 18 70 36 68 64 L32 64 C30 36 36 18 50 6 Z ${ring(50, 34, 8)}"/><path d="M32 44 L16 68 L32 66 Z M68 44 L84 68 L68 66 Z"/><path d="M40 68 L60 68 L50 94 Z" opacity=".7"/></g>`,
  planet: (c) => `<g fill="${c}"><circle cx="50" cy="50" r="25"/></g><ellipse cx="50" cy="52" rx="44" ry="12" fill="none" stroke="${c}" stroke-width="6" transform="rotate(-18 50 52)"/>`,
  torii: (c) =>
    `<g fill="${c}"><path d="M6 16 Q50 6 94 16 L92 25 Q50 17 8 25 Z"/><rect x="16" y="31" width="68" height="7"/><rect x="25" y="22" width="9" height="70"/><rect x="66" y="22" width="9" height="70"/><rect x="45.5" y="31" width="9" height="13"/></g>`,
  katana: (c) =>
    `<g fill="${c}" transform="rotate(-40 50 50)"><path d="M46 2 Q55 28 54 64 L46 64 Z"/><rect x="38" y="64" width="24" height="6" rx="3"/><rect x="46" y="70" width="8" height="28" rx="3"/></g>`,
  mountain: (c, bg) => `<path fill="${c}" d="M4 86 L36 28 L52 54 L66 36 L96 86 Z"/><path fill="${bg}" opacity=".85" d="M36 28 L45 44 L40 41 L35 47 L30 41 L27 45 Z"/>`,
  palm: (c) =>
    `<g fill="${c}"><path d="M47 94 Q43 66 51 40 L56 41 Q49 66 54 94 Z"/><path d="M53 40 Q30 24 10 38 Q32 30 53 43 Z M53 40 Q76 22 92 36 Q72 30 54 44 Z M53 40 Q44 16 24 14 Q44 22 52 42 Z M53 40 Q64 14 84 12 Q64 22 55 43 Z"/></g>`,
  sun: (c) => {
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays += `M${f1(50 + Math.cos(a) * 30)} ${f1(50 + Math.sin(a) * 30)} L${f1(50 + Math.cos(a) * 44)} ${f1(50 + Math.sin(a) * 44)} `;
    }
    return `<circle cx="50" cy="50" r="22" fill="${c}"/>${line(rays, c, 6)}`;
  },
  lotus: (c) =>
    `<path fill="${c}" d="M50 26 Q63 48 50 74 Q37 48 50 26 Z M50 74 Q29 70 18 44 Q40 48 50 74 Z M50 74 Q71 70 82 44 Q60 48 50 74 Z M50 74 Q24 79 6 64 Q30 58 50 74 Z M50 74 Q76 79 94 64 Q70 58 50 74 Z"/>`,
  diya: (c) => `<g fill="${c}"><path d="M10 60 Q50 96 90 60 Q70 56 50 58 Q30 56 10 60 Z"/><path d="M50 18 Q62 36 50 52 Q38 36 50 18 Z" opacity=".85"/></g>`,
  chai: (c) => `<path fill="${c}" d="M28 40 L72 40 L65 90 L35 90 Z"/>${line('M40 32 Q34 24 40 16 M50 32 Q44 24 50 12 M60 32 Q54 24 60 16', c, 4.5)}`,
  pizza: (c) => `<path fill="${c}" fill-rule="evenodd" d="M12 20 Q50 4 88 20 L50 94 Z ${ring(38, 32, 6.5)} ${ring(60, 36, 6.5)} ${ring(48, 56, 6.5)}"/>`,
  popcorn: (c) =>
    `<g fill="${c}"><path fill-rule="evenodd" d="M24 44 L76 44 L69 94 L31 94 Z M39 48 L44 48 L42 90 L37 90 Z M56 48 L61 48 L63 90 L58 90 Z"/><circle cx="32" cy="38" r="10"/><circle cx="50" cy="32" r="11"/><circle cx="68" cy="38" r="10"/><circle cx="41" cy="20" r="9"/><circle cx="59" cy="20" r="9"/></g>`,
  controller: (c) =>
    `<path fill="${c}" fill-rule="evenodd" d="M20 32 H80 Q95 32 95 52 Q95 80 82 80 Q73 80 68 68 H32 Q27 80 18 80 Q5 80 5 52 Q5 32 20 32 Z M23 47 h6 v-6 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 Z ${ring(68, 46, 4.5)} ${ring(78, 55, 4.5)}"/>`,
  cricket: (c) => `<g fill="${c}"><g transform="rotate(32 50 50)"><rect x="45" y="4" width="10" height="22" rx="3"/><path d="M39 26 H61 V84 Q50 94 39 84 Z"/></g><circle cx="20" cy="80" r="11"/></g>`,
  football: (c) =>
    `<path fill="${c}" fill-rule="evenodd" d="${ring(50, 50, 44)} M50 33 L65 44 L59 61 L41 61 L35 44 Z M15 35 L25 30 L29 41 L21 48 L12 44 Z M85 35 L75 30 L71 41 L79 48 L88 44 Z M38 87 L44 76 L56 76 L62 87 L50 93 Z"/>`,
  note: (c) =>
    `<g fill="${c}"><rect x="38" y="24" width="6" height="54"/><rect x="74" y="15" width="6" height="54"/><path d="M38 24 L80 14 L80 25 L38 35 Z"/><ellipse cx="31" cy="79" rx="12" ry="9" transform="rotate(-20 31 79)"/><ellipse cx="67" cy="70" rx="12" ry="9" transform="rotate(-20 67 70)"/></g>`,
  headphones: (c) =>
    `<g fill="${c}"><path d="M12 58 Q12 14 50 14 Q88 14 88 58 L79 58 Q79 23 50 23 Q21 23 21 58 Z"/><rect x="8" y="50" width="20" height="34" rx="8"/><rect x="72" y="50" width="20" height="34" rx="8"/></g>`,
  car: (c, bg) =>
    `<path fill="${c}" fill-rule="evenodd" d="M4 66 Q6 54 20 52 L34 50 Q44 36 58 36 L70 36 Q81 38 89 50 Q97 53 97 62 L97 70 L4 70 Z M40 50 Q48 41 58 41 L66 41 Q73 43 77 50 Z"/><circle cx="26" cy="70" r="11" fill="${c}"/><circle cx="76" cy="70" r="11" fill="${c}"/><circle cx="26" cy="70" r="4.5" fill="${bg}"/><circle cx="76" cy="70" r="4.5" fill="${bg}"/>`,
  gauge: (c) => {
    let ticks = '';
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (0.8 + (i / 8) * 1.4);
      ticks += `M${f1(50 + Math.cos(a) * 28)} ${f1(56 + Math.sin(a) * 28)} L${f1(50 + Math.cos(a) * 35)} ${f1(56 + Math.sin(a) * 35)} `;
    }
    return `<path fill="${c}" fill-rule="evenodd" d="${ring(50, 56, 44)} ${ring(50, 56, 38)}"/>${line(ticks, c, 4)}<path fill="${c}" d="M47 59 L74 33 L53 62 Z"/><circle cx="50" cy="58" r="7" fill="${c}"/>`;
  },
  paw: (c) =>
    `<g fill="${c}"><ellipse cx="50" cy="66" rx="23" ry="19"/><ellipse cx="22" cy="42" rx="9" ry="12"/><ellipse cx="39" cy="24" rx="9" ry="12"/><ellipse cx="61" cy="24" rx="9" ry="12"/><ellipse cx="78" cy="42" rx="9" ry="12"/></g>`,
  heart: (c) => `<path fill="${c}" d="M50 90 C20 68 6 52 6 34 C6 19 18 9 31 9 C40 9 46 14 50 22 C54 14 60 9 69 9 C82 9 94 19 94 34 C94 52 80 68 50 90 Z"/>`,
  warning: (c) => `<path fill="${c}" fill-rule="evenodd" d="M50 6 L96 90 L4 90 Z M45 34 H55 L53 66 H47 Z M45 72 H55 V82 H45 Z"/>`,
  bolt: (c) => `<path fill="${c}" d="M60 4 L20 56 L46 56 L36 96 L80 40 L54 40 Z"/>`,
  dumbbell: (c) =>
    `<g fill="${c}"><rect x="26" y="45" width="48" height="10" rx="3"/><rect x="12" y="28" width="14" height="44" rx="3"/><rect x="74" y="28" width="14" height="44" rx="3"/><rect x="3" y="37" width="9" height="26" rx="2"/><rect x="88" y="37" width="9" height="26" rx="2"/></g>`,
  crown: (c) => `<g fill="${c}"><path d="M8 74 L12 26 L32 48 L50 18 L68 48 L88 26 L92 74 Z"/><rect x="8" y="79" width="84" height="11" rx="2"/></g>`,
  laugh: (c, bg) =>
    `<circle cx="50" cy="50" r="44" fill="${c}"/>${line('M26 42 Q33 32 40 42 M60 42 Q67 32 74 42', bg, 5.5)}<path fill="${bg}" d="M26 56 Q50 88 74 56 Z"/>`,
  clapper: (c, bg) =>
    `<g fill="${c}"><rect x="8" y="40" width="84" height="52" rx="4"/><path d="M8 26 L86 12 L89 25 L11 39 Z"/></g><path fill="${bg}" d="M24 23 L33 21 L26 35 L17 37 Z M45 19 L54 17 L47 31 L38 33 Z M66 15 L75 13 L68 27 L59 29 Z"/>`,
  code: (c) => line('M32 22 L8 50 L32 78 M68 22 L92 50 L68 78 M58 14 L42 86', c, 9),
  quote: (c) => `<path fill="${c}" d="M12 58 Q12 24 42 16 L45 25 Q30 31 28 44 L43 44 L43 78 L12 78 Z M55 58 Q55 24 85 16 L88 25 Q73 31 71 44 L86 44 L86 78 L55 78 Z"/>`,
  spiral: (c) => {
    let d = 'M50 50';
    for (let t = 0.3; t <= 6 * Math.PI; t += 0.3) d += ` L${f1(50 + Math.cos(t) * t * 2.2)} ${f1(50 + Math.sin(t) * t * 2.2)}`;
    return line(d, c, 6);
  },
  waves: (c) => line('M6 32 Q17 20 28 32 T50 32 T72 32 T94 32 M6 52 Q17 40 28 52 T50 52 T72 52 T94 52 M6 72 Q17 60 28 72 T50 72 T72 72 T94 72', c, 7),
};

/** A symbol centred on (cx, cy), `size` wide, in colour `c` (`bg` is for small cut-out details). */
export function drawMotif(m: Motif, cx: number, cy: number, size: number, c: string, bg: string, opacity?: number): string {
  const draw = DRAW[m];
  if (!draw) return '';
  const s = size / 100;
  return `<g transform="translate(${f1(cx - size / 2)} ${f1(cy - size / 2)}) scale(${f1(s * 1000) / 1000})"${opacity !== undefined ? ` opacity="${opacity}"` : ''}>${draw(c, bg)}</g>`;
}

export const isMotif = (v: unknown): v is Motif => typeof v === 'string' && (MOTIFS as readonly string[]).includes(v);
