/**
 * Generative placeholder artwork in the Midnight Neon palette.
 *
 * Everything here is original, deterministic (the same spec always renders the
 * same SVG) and isomorphic, so it can run on the server and in the browser.
 * Text uses the site's CSS font variables, which is why the SVG is inlined in
 * the page rather than loaded through an <img>.
 */
import { drawMotif, isMotif, type Motif } from './motifs';
import type { ArtKind, ArtSpec, FrameColor, PaletteKey, PosterKind, Scene, StickerShape } from './types';

const P = {
  a: '#C6FF3D', // lime
  b: '#FF2E4D', // racing red
  c: '#8B5CFF', // violet
  d: '#2DE2E6', // cyan
  e: '#FF9F1C', // orange
  f: '#FF4FD8', // magenta
  ink: '#0B0B12',
  paper: '#F5F5F7',
  light: '#15151F',
  fg: '#F5F5F7',
} as const;

const DARKS: ReadonlyArray<readonly [string, string]> = [
  ['#0E0E18', '#24123F'],
  ['#0B1220', '#123A5A'],
  ['#140B16', '#4A0F2B'],
  ['#0A1512', '#0F3D33'],
  ['#15100A', '#3D2A0F'],
];

const DISPLAY = 'var(--font-display)';
const SANS = 'var(--font-sans)';
const HAND = 'var(--font-hand)';
/** Average glyph width of the display face as a fraction of font size (Anton is condensed). */
const WF = 0.5;
const TAU = Math.PI * 2;

const f1 = (n: number) => Math.round(n * 10) / 10;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const textOn = (hex: string) => (lum(hex) > 0.36 ? P.ink : '#FFFFFF');

class Ctx {
  private n = 0;
  readonly dark: readonly [string, string];
  constructor(
    private readonly prefix: string,
    darkIndex: number,
  ) {
    this.dark = DARKS[Math.abs(darkIndex) % DARKS.length];
  }
  id(p: string): string {
    this.n += 1;
    return `${this.prefix}${p}${this.n}`;
  }
  col(k: PaletteKey): string {
    if (k === 'dark') return this.dark[0];
    if (k === 'dark2') return this.dark[1];
    return P[k];
  }
}

/* ---------- small SVG helpers ---------- */

const svg = (vb: string, inner: string, label?: string, cls?: string) =>
  `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"${cls ? ` class="${cls}"` : ''} ${
    label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"'
  }>${inner}</svg>`;

const grad = (id: string, stops: Array<[number, string]>, vertical = false) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`;

const shadow = (id: string, dy = 3, sd = 3.5, op = 0.35) =>
  `<filter id="${id}" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${sd}" flood-color="#000000" flood-opacity="${op}"/></filter>`;

function text(
  x: number,
  y: number,
  txt: string,
  size: number,
  fill: string,
  o: { anchor?: 'start' | 'middle' | 'end'; font?: string; weight?: number; central?: boolean; spacing?: number; opacity?: number; transform?: string } = {},
): string {
  const attrs = [
    o.transform ? `transform="${o.transform}"` : `x="${f1(x)}" y="${f1(y)}"`,
    `text-anchor="${o.anchor ?? 'middle'}"`,
    o.central ? 'dominant-baseline="central"' : '',
    `style="font-family:${o.font ?? DISPLAY}"`,
    o.weight ? `font-weight="${o.weight}"` : '',
    `font-size="${f1(size)}"`,
    `fill="${fill}"`,
    o.spacing ? `letter-spacing="${o.spacing}"` : '',
    o.opacity !== undefined ? `opacity="${o.opacity}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${attrs}>${esc(txt)}</text>`;
}

const fit = (txt: string, max: number, width: number) => Math.max(8, Math.min(max, Math.round(width / (Math.max(1, txt.length) * WF))));

function closedCurve(pts: Array<[number, number]>): string {
  const n = pts.length;
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n],
      p1 = pts[i],
      p2 = pts[(i + 1) % n],
      p3 = pts[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return `${d}Z`;
}

function blob(cx: number, cy: number, r: number, n: number, jit: number, rand: () => number): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rr = r * (1 - jit / 2 + rand() * jit);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return closedCurve(pts);
}

function scallop(cx: number, cy: number, r: number, n: number, depth: number): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU;
    const rr = i % 2 ? r * (1 - depth) : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return closedCurve(pts);
}

function star(cx: number, cy: number, r1: number, r2: number, n: number, rot = -Math.PI / 2): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = rot + (i * Math.PI) / n;
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r)}`;
  }
  return `${d}Z`;
}

function heart(cx: number, cy: number, s: number): string {
  let d = '';
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * TAU;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    d += `${i ? 'L' : 'M'}${f1(cx + (x * s) / 16)},${f1(cy - (y * s) / 16)}`;
  }
  return `${d}Z`;
}

function sparkles(rand: () => number, spots: Array<[number, number]>, color: string, op: number): string {
  return spots
    .map(([x, y]) => {
      const k = 5 + rand() * 4;
      return `<path d="${star(x, y, k, k * 0.3, 4)}" fill="${color}" opacity="${op}"/>`;
    })
    .join('');
}

/* ---------- stickers ---------- */

interface StickerOpts {
  shape: StickerShape;
  word?: string;
  c1: PaletteKey;
  c2: PaletteKey;
  seed: number;
  variant?: 'plain' | 'holo' | 'clear' | 'motion' | 'dome' | 'magnet';
  motif?: Motif;
}

/** Sticker artwork in a 200 × 200 box (with room for the cut border). */
function stickerParts(ctx: Ctx, o: StickerOpts): { defs: string; body: string } {
  const r = rng(o.seed);
  const g = ctx.id('g');
  const sh = ctx.id('s');
  const c1 = ctx.col(o.c1);
  const c2 = ctx.col(o.c2);
  const variant = o.variant ?? 'plain';
  const foil = variant === 'holo' && o.shape !== 'moon';
  let defs =
    grad(g, foil ? [[0, c1], [0.35, P.f], [0.65, P.d], [1, c2]] : [[0, c1], [1, c2]]) +
    shadow(sh, variant === 'magnet' || variant === 'dome' ? 6 : 4, variant === 'dome' ? 5 : 4, 0.45);
  const tc = textOn(c1);
  const geo: string[] = [];
  let body = '';
  const fill = `url(#${g})`;
  const word = o.word ?? '';
  const say = (txt: string, x: number, y: number, size: number, color = tc) => text(x, y, txt, size, color, { central: true });
  // With a theme symbol, it sits above a smaller word; the cut-out details use the sticker's first colour.
  const m = o.motif;
  const sym = (cx: number, cy: number, size: number) => (m ? drawMotif(m, cx, cy, size, tc, c1) : '');

  switch (o.shape) {
    case 'blob': {
      const d = blob(100, 100, 76, 9, 0.26, r);
      geo.push(`<path d="${d}"/>`);
      body += `<path d="${d}" fill="${fill}"/>${sparkles(r, [[56, 58], [146, 60], [58, 146], [144, 146]], '#FFFFFF', 0.85)}`;
      if (m) body += sym(100, word ? 82 : 100, word ? 66 : 92) + (word ? say(word, 100, 140, fit(word, 28, 100)) : '');
      else if (word) body += say(word, 100, 102, fit(word, 54, 128));
      break;
    }
    case 'star': {
      const d = star(100, 102, 90, 60, 9);
      geo.push(`<path d="${d}"/>`);
      body += `<path d="${d}" fill="${fill}"/>`;
      if (m) body += sym(100, word ? 90 : 102, word ? 54 : 72) + (word ? say(word, 100, 128, fit(word, 20, 80)) : '');
      else if (word) body += say(word, 100, 104, fit(word, 42, 104));
      break;
    }
    case 'badge': {
      const d = scallop(100, 100, 86, 14, 0.07);
      geo.push(`<path d="${d}"/>`);
      body += `<path d="${d}" fill="${fill}"/><circle cx="100" cy="100" r="64" fill="none" stroke="${tc}" stroke-opacity=".55" stroke-width="2.5" stroke-dasharray="2 6" stroke-linecap="round"/>`;
      if (m) body += sym(100, word ? 86 : 100, word ? 58 : 80) + (word ? say(word, 100, 134, fit(word, 24, 92)) : '');
      else if (word) body += say(word, 100, 102, fit(word, 56, 104));
      break;
    }
    case 'pill': {
      geo.push('<rect x="14" y="60" width="172" height="80" rx="40"/>');
      body += `<rect x="14" y="60" width="172" height="80" rx="40" fill="${fill}"/>`;
      body += m ? sym(52, 100, 44) : `<circle cx="44" cy="100" r="9" fill="${tc}" opacity=".85"/>`;
      if (word) body += m ? say(word, 128, 101, fit(word, 30, 84)) : say(word, 112, 101, fit(word, 34, 116));
      break;
    }
    case 'heart': {
      const d = heart(100, 104, 84);
      geo.push(`<path d="${d}"/>`);
      body += `<path d="${d}" fill="${fill}"/>${sparkles(r, [[70, 78], [128, 120]], '#FFFFFF', 0.9)}`;
      break;
    }
    case 'cat': {
      const head = '<ellipse cx="100" cy="114" rx="70" ry="60"/>';
      const earL = '<path d="M40 92 L50 26 L94 62 Z"/>';
      const earR = '<path d="M160 92 L150 26 L106 62 Z"/>';
      geo.push(head, earL, earR);
      body += `<g fill="${fill}">${head}${earL}${earR}</g>`;
      body += `<path d="M55 80 L59 44 L82 62 Z" fill="${P.f}" opacity=".8"/><path d="M145 80 L141 44 L118 62 Z" fill="${P.f}" opacity=".8"/>`;
      body += `<ellipse cx="76" cy="110" rx="9" ry="12" fill="${P.ink}"/><ellipse cx="124" cy="110" rx="9" ry="12" fill="${P.ink}"/><circle cx="79" cy="106" r="3" fill="#FFFFFF"/><circle cx="127" cy="106" r="3" fill="#FFFFFF"/>`;
      body += `<ellipse cx="60" cy="132" rx="11" ry="7" fill="${P.f}" opacity=".65"/><ellipse cx="140" cy="132" rx="11" ry="7" fill="${P.f}" opacity=".65"/>`;
      body += `<path d="M94 128 L106 128 L100 135 Z" fill="${P.f}"/><path d="M100 135 Q95 143 87 139 M100 135 Q105 143 113 139" fill="none" stroke="${P.ink}" stroke-width="3" stroke-linecap="round"/>`;
      body += `<g stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round" opacity=".75"><path d="M52 122 L31 117"/><path d="M52 130 L31 133"/><path d="M148 122 L169 117"/><path d="M148 130 L169 133"/></g>`;
      break;
    }
    case 'moon': {
      const d = scallop(100, 100, 86, 12, 0.06);
      const m = ctx.id('m');
      defs += `<mask id="${m}"><rect x="0" y="0" width="200" height="200" fill="#FFFFFF"/><circle cx="122" cy="80" r="40" fill="#000000"/></mask>`;
      geo.push(`<path d="${d}"/>`);
      body += `<path d="${d}" fill="${fill}"/><circle cx="100" cy="92" r="44" fill="${P.a}" mask="url(#${m})"/>`;
      body += sparkles(r, [[52, 62], [150, 138], [60, 136], [146, 56], [40, 100], [160, 98]], '#FFFFFF', 0.9);
      if (word) body += say(word, 100, 160, fit(word, 26, 110), '#FFFFFF');
      break;
    }
  }

  const shapes = geo.join('');
  if (variant === 'clear') {
    const cl = ctx.id('cl');
    defs += `<clipPath id="${cl}">${shapes}</clipPath>`;
    const glass = `<g clip-path="url(#${cl})"><rect x="-20" y="-20" width="240" height="240" fill="#FFFFFF" opacity=".06"/><path d="M-10 70 L90 -10 L130 -10 L10 110 Z" fill="#FFFFFF" opacity=".12"/></g>`;
    const cut = `<g fill="none" stroke="#FFFFFF" stroke-opacity=".75" stroke-width="2" stroke-dasharray="7 6" stroke-linejoin="round">${shapes}</g>`;
    return { defs, body: `<g opacity=".92">${body}</g>${glass}${cut}` };
  }

  let base = '';
  if (variant === 'magnet') base += `<g transform="translate(0 7)" fill="#2A2A3D" stroke="#2A2A3D" stroke-width="14" stroke-linejoin="round">${shapes}</g>`;
  base += `<g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="14" stroke-linejoin="round" filter="url(#${sh})">${shapes}</g>`;

  let over = '';
  if (variant === 'motion') {
    const cl = ctx.id('cl');
    const pat = ctx.id('pt');
    defs += `<clipPath id="${cl}">${shapes}</clipPath><pattern id="${pat}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="4" height="8" fill="${c2}" opacity=".35"/></pattern>`;
    over += `<g clip-path="url(#${cl})"><rect x="-20" y="-20" width="240" height="240" fill="url(#${pat})"/></g>`;
  }
  if (variant === 'dome') {
    const cl = ctx.id('cl');
    defs += `<clipPath id="${cl}">${shapes}</clipPath>`;
    over += `<g clip-path="url(#${cl})"><ellipse cx="78" cy="58" rx="70" ry="34" fill="#FFFFFF" opacity=".28" transform="rotate(-24 78 58)"/><ellipse cx="140" cy="160" rx="40" ry="14" fill="#FFFFFF" opacity=".12" transform="rotate(-24 140 160)"/></g>`;
  }
  return { defs, body: base + body + over };
}

function sticker(ctx: Ctx, o: StickerOpts, label?: string): string {
  const { defs, body } = stickerParts(ctx, o);
  return svg('-14 -14 228 228', `<defs>${defs}</defs>${body}`, label);
}

/* ---------- posters (300 × 424, close to the A-series ratio) ---------- */

interface PosterOpts {
  kind: PosterKind;
  seed: number;
  title?: string;
  frame?: FrameColor;
  vb?: string;
  /** A theme symbol drawn as the poster's centrepiece, in place of its number, sun, planet or flower. */
  motif?: Motif;
}

interface Parts {
  vb: string;
  w: number;
  h: number;
  defs: string;
  body: string;
}

const tsize = (txt: string, base: number, width: number) => Math.min(base, Math.round(width / (Math.max(1, txt.length) * WF)));

function posterParts(ctx: Ctx, o: PosterOpts): Parts {
  const r = rng(o.seed);
  const [dk, dk2] = ctx.dark;
  let defs = '';
  let art = '';
  const W = 300;
  const H = 424;
  const title = (o.title ?? 'PIT LANE').toUpperCase();
  const sub = (txt: string, y: number, color: string, anchor: 'start' | 'middle' | 'end' = 'middle', x = 150) =>
    text(x, y, txt, 10.5, color, { anchor, font: SANS, weight: 700, spacing: 2.4, opacity: 0.8 });
  const series = (name: string) => `${name} SERIES · NO. ${String((o.seed % 89) + 1).padStart(2, '0')}`;

  if (o.kind === 'speed') {
    const bg = ctx.id('pb');
    defs += `<linearGradient id="${bg}" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${dk}"/><stop offset="1" stop-color="${dk2}"/></linearGradient>`;
    art += `<rect width="${W}" height="${H}" fill="url(#${bg})"/>`;
    const num = String((o.seed % 98) + 1).padStart(2, '0');
    art += o.motif
      ? drawMotif(o.motif, 150, 170, 170, P.a, dk, 0.9)
      : `<text x="150" y="196" text-anchor="middle" dominant-baseline="central" style="font-family:${DISPLAY}" font-size="${tsize(num, 230, 290)}" fill="none" stroke="${P.a}" stroke-width="2.5" opacity=".9">${num}</text>`;
    let lines = '';
    for (let i = 0; i < 22; i++) {
      const y = 150 + r() * 190;
      const x = -40 + r() * 200;
      const len = 60 + r() * 220;
      const w = 1 + r() * 3;
      lines += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(len)}" height="${f1(w)}" fill="${i % 3 ? P.paper : P.a}" opacity="${f1(0.15 + r() * 0.55)}"/>`;
    }
    art += `<g transform="rotate(-10 150 250)">${lines}</g>`;
    const car = r() > 0.5 ? P.b : P.f;
    art += `<g transform="translate(0 4)"><path d="M30 304 L112 288 L150 270 L196 270 L216 286 L262 292 L272 312 L30 314 Z" fill="${car}"/><path d="M150 272 L172 258 L192 272 Z" fill="${P.ink}"/><rect x="252" y="268" width="28" height="8" fill="${car}"/><rect x="263" y="268" width="6" height="28" fill="${P.ink}"/><rect x="18" y="296" width="22" height="16" fill="${P.ink}"/><circle cx="78" cy="314" r="20" fill="${P.ink}"/><circle cx="78" cy="314" r="8" fill="${P.paper}" opacity=".5"/><circle cx="230" cy="314" r="20" fill="${P.ink}"/><circle cx="230" cy="314" r="8" fill="${P.paper}" opacity=".5"/><rect x="104" y="296" width="70" height="5" fill="${P.paper}" opacity=".85"/></g>`;
    art += text(22, 372, title, tsize(title, 42, 256), P.paper, { anchor: 'start' });
    art += sub(series('NIGHT RACE'), 398, P.paper, 'start', 22);
    art += sub('PRINTYOURVIBE', 34, P.a, 'start', 22) + sub('2026', 34, P.paper, 'end', 278);
  } else if (o.kind === 'sunset') {
    const sky = ctx.id('sk');
    const sun = ctx.id('su');
    const mk = ctx.id('mk');
    defs += grad(sky, [[0, P.c], [0.55, P.f], [1, P.e]], true) + grad(sun, [[0, P.a], [1, P.e]], true);
    let cuts = '';
    for (let i = 0; i < 6; i++) cuts += `<rect x="0" y="${212 + i * 13}" width="300" height="${f1(2 + i * 1.6)}" fill="#000000"/>`;
    defs += `<mask id="${mk}"><rect width="300" height="424" fill="#FFFFFF"/>${cuts}</mask>`;
    art += `<rect width="300" height="424" fill="url(#${sky})"/><circle cx="150" cy="222" r="92" fill="url(#${sun})" mask="url(#${mk})"/>`;
    const ridge = (base: number, amp: number, seed: number, color: string) => {
      const rr = rng(seed);
      let d = `M0 ${base}`;
      for (let x = 0; x <= 300; x += 30) d += ` L${x} ${f1(base - rr() * amp)}`;
      return `<path d="${d} L300 424 L0 424 Z" fill="${color}"/>`;
    };
    if (o.motif) art += drawMotif(o.motif, 150, 196, 116, dk, P.e, 0.92);
    art += ridge(286, 60, o.seed + 1, P.c) + ridge(314, 46, o.seed + 2, dk2) + ridge(342, 30, o.seed + 3, dk);
    art += text(150, 386, title, tsize(title, 36, 270), P.paper) + sub(series('SUNSET'), 408, P.paper);
  } else if (o.kind === 'orbit') {
    const bg = ctx.id('ob');
    const pl = ctx.id('pl');
    defs += `<radialGradient id="${bg}" cx=".5" cy=".35" r=".9"><stop offset="0" stop-color="${dk2}"/><stop offset="1" stop-color="${dk}"/></radialGradient>${grad(pl, [[0, P.d], [1, P.c]])}`;
    art += `<rect width="300" height="424" fill="url(#${bg})"/>`;
    for (let i = 0; i < 70; i++) art += `<circle cx="${f1(r() * 300)}" cy="${f1(r() * 330)}" r="${f1(0.5 + r() * 1.4)}" fill="#FFFFFF" opacity="${f1(0.3 + r() * 0.7)}"/>`;
    art += `<g fill="none" stroke="${P.paper}" stroke-opacity=".22"><ellipse cx="150" cy="190" rx="132" ry="42"/><ellipse cx="150" cy="190" rx="104" ry="31"/></g>`;
    art += o.motif
      ? drawMotif(o.motif, 150, 190, 136, P.d, dk)
      : `<circle cx="150" cy="190" r="62" fill="url(#${pl})"/><ellipse cx="150" cy="190" rx="104" ry="20" fill="none" stroke="${P.a}" stroke-width="7" transform="rotate(-16 150 190)"/>`;
    art += `<circle cx="236" cy="96" r="12" fill="${P.b}"/>`;
    art += text(150, 380, title, tsize(title, 36, 270), '#FFFFFF') + sub(series('SPACE'), 404, '#FFFFFF');
  } else if (o.kind === 'bloom') {
    art += `<rect width="300" height="424" fill="${dk}"/><path d="M150 230 C146 290 156 330 150 424" stroke="${P.d}" stroke-width="6" fill="none"/><ellipse cx="124" cy="304" rx="28" ry="10" fill="${P.a}" transform="rotate(-30 124 304)"/><ellipse cx="178" cy="282" rx="28" ry="10" fill="${P.a}" transform="rotate(28 178 282)"/>`;
    if (o.motif) art += `<circle cx="150" cy="150" r="84" fill="${P.c}" opacity=".35"/>${drawMotif(o.motif, 150, 150, 132, P.f, dk)}`;
    else {
      for (let i = 0; i < 12; i++) art += `<ellipse cx="150" cy="100" rx="20" ry="52" fill="${i % 2 ? P.f : P.c}" opacity=".94" transform="rotate(${i * 30} 150 150)"/>`;
      art += `<circle cx="150" cy="150" r="26" fill="${P.e}"/>`;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        art += `<circle cx="${f1(150 + Math.cos(a) * 14)}" cy="${f1(150 + Math.sin(a) * 14)}" r="2.4" fill="${P.ink}" opacity=".5"/>`;
      }
    }
    art += text(150, 392, title, tsize(title, 32, 270), P.paper) + sub(series('BOTANICAL'), 412, P.paper);
  } else if (o.kind === 'grid') {
    const bg = ctx.id('gb');
    const sun = ctx.id('gs');
    const mk = ctx.id('gm');
    defs += grad(bg, [[0, dk], [1, dk2]], true) + grad(sun, [[0, P.e], [1, P.f]], true);
    let cuts = '';
    for (let i = 0; i < 5; i++) cuts += `<rect x="0" y="${196 + i * 11}" width="300" height="${f1(2 + i * 1.5)}" fill="#000000"/>`;
    defs += `<mask id="${mk}"><rect width="300" height="424" fill="#FFFFFF"/>${cuts}</mask>`;
    art += `<rect width="300" height="424" fill="url(#${bg})"/>`;
    for (let i = 0; i < 40; i++) art += `<circle cx="${f1(r() * 300)}" cy="${f1(r() * 180)}" r="${f1(0.4 + r() * 1.1)}" fill="#FFFFFF" opacity="${f1(0.25 + r() * 0.6)}"/>`;
    art += `<circle cx="150" cy="190" r="78" fill="url(#${sun})" mask="url(#${mk})"/>`;
    if (o.motif) art += drawMotif(o.motif, 150, 176, 104, P.ink, P.e, 0.9);
    art += `<path d="M0 252 L40 224 L72 240 L110 214 L150 246 L188 218 L232 240 L268 222 L300 236 L300 254 L0 254 Z" fill="${P.ink}" opacity=".9"/>`;
    art += `<rect x="0" y="252" width="300" height="172" fill="${P.ink}"/>`;
    let gl = '';
    for (let i = -8; i <= 8; i++) gl += `<path d="M150 252 L${150 + i * 60} 424"/>`;
    for (let k = 1; k <= 9; k++) {
      const y = 252 + Math.pow(k / 9, 1.9) * 172;
      gl += `<path d="M0 ${f1(y)} L300 ${f1(y)}"/>`;
    }
    art += `<g stroke="${P.f}" stroke-width="1.2" opacity=".85" fill="none">${gl}</g>`;
    art += text(150, 352, title, tsize(title, 38, 260), P.a) + sub(series('SYNTHWAVE'), 376, P.paper);
  } else {
    const bg = ctx.id('wb');
    defs += grad(bg, [[0, dk2], [1, dk]], true);
    const sunX = f1(80 + r() * 140);
    art += `<rect width="300" height="424" fill="url(#${bg})"/>`;
    art += o.motif ? drawMotif(o.motif, 150, 96, 104, P.a, dk2) : `<circle cx="${sunX}" cy="92" r="34" fill="${P.a}"/>`;
    const layers = [P.c, P.d, P.f, P.e, P.b];
    layers.forEach((color, i) => {
      const base = 170 + i * 42;
      const amp = 10 + r() * 14;
      const freq = 0.018 + r() * 0.012;
      const phase = r() * TAU;
      let d = `M0 ${base}`;
      for (let x = 0; x <= 300; x += 10) d += ` L${x} ${f1(base + Math.sin(x * freq + phase) * amp)}`;
      art += `<path d="${d} L300 424 L0 424 Z" fill="${color}" opacity="${f1(0.55 + i * 0.09)}"/>`;
    });
    art += text(150, 396, title, tsize(title, 34, 260), P.paper) + sub(series('TIDE'), 414, P.paper);
  }

  if (!o.frame || o.frame === 'none') return { vb: o.vb ?? '0 0 300 424', w: 300, h: 424, defs, body: art };
  const fr = { black: ['#2A2A2A', '#0A0A0A'], white: ['#FFFFFF', '#DCDAD5'], wood: ['#A87445', '#6B4423'] }[o.frame];
  const fg = ctx.id('fr');
  defs += grad(fg, [[0, fr[0]], [1, fr[1]]]);
  const frame = `<rect x="-40" y="-40" width="380" height="504" fill="url(#${fg})"/><rect x="-40" y="-40" width="380" height="504" fill="none" stroke="#000000" stroke-opacity=".25" stroke-width="2"/><rect x="-26" y="-26" width="352" height="476" fill="#F4F2EE"/><rect x="-26" y="-26" width="352" height="476" fill="none" stroke="#000000" stroke-opacity=".12" stroke-width="3"/>`;
  return { vb: o.vb ?? '-40 -40 380 504', w: 380, h: 504, defs, body: frame + art };
}

function poster(ctx: Ctx, o: PosterOpts, label?: string, cls?: string): string {
  const p = posterParts(ctx, o);
  if (o.vb) return svg(p.vb, `<defs>${p.defs}</defs>${p.body}`, label, cls);
  const [x, y, w, h] = p.vb.split(' ').map(Number);
  const sh = ctx.id('psh');
  return svg(`${x - 10} ${y - 8} ${w + 20} ${h + 24}`, `<defs>${p.defs}${shadow(sh, 6, 7, 0.45)}</defs><g filter="url(#${sh})">${p.body}</g>`, label, cls);
}

/** Embed a poster (or a crop of it) inside a larger composition. */
function nestedPoster(ctx: Ctx, o: PosterOpts, x: number, y: number, w: number, h: number, slice = false): { defs: string; body: string } {
  const p = posterParts(ctx, o);
  return {
    defs: p.defs,
    body: `<svg x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" viewBox="${p.vb}"${slice ? ' preserveAspectRatio="xMidYMid slice"' : ''}>${p.body}</svg>`,
  };
}

/* ---------- polaroids ---------- */

function polaroidParts(ctx: Ctx, o: { seed: number; scene: Scene; caption?: string }): { defs: string; body: string } {
  const r = rng(o.seed);
  const cl = ctx.id('pc');
  const g = ctx.id('pg');
  const [dk, dk2] = ctx.dark;
  let defs = `<clipPath id="${cl}"><rect x="14" y="14" width="192" height="192"/></clipPath>`;
  let scene = '';
  if (o.scene === 'rain') {
    defs += grad(g, [[0, dk], [1, P.c]], true);
    scene += `<rect x="14" y="14" width="192" height="192" fill="url(#${g})"/>`;
    let x = 10;
    while (x < 210) {
      const w = 18 + r() * 24;
      const h = 46 + r() * 86;
      scene += `<rect x="${f1(x)}" y="${f1(206 - h)}" width="${f1(w)}" height="${f1(h)}" fill="${dk2}"/>`;
      for (let wy = 206 - h + 8; wy < 198; wy += 11) for (let wx = x + 4; wx < x + w - 5; wx += 7) if (r() > 0.6) scene += `<rect x="${f1(wx)}" y="${f1(wy)}" width="3.5" height="4.5" fill="${P.a}" opacity=".85"/>`;
      x += w + 3;
    }
    for (let i = 0; i < 44; i++) scene += `<path d="M${f1(14 + r() * 200)} ${f1(8 + r() * 196)}l-4 13" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round"/>`;
  } else if (o.scene === 'beach') {
    defs += grad(g, [[0, P.c], [0.6, P.f], [1, P.e]], true);
    scene += `<rect x="14" y="14" width="192" height="192" fill="url(#${g})"/><circle cx="150" cy="96" r="26" fill="${P.a}"/><rect x="14" y="128" width="192" height="44" fill="${P.d}" opacity=".85"/>`;
    for (let i = 0; i < 6; i++) scene += `<path d="M${f1(14 + r() * 150)} ${136 + i * 6}h${f1(20 + r() * 30)}" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>`;
    scene += `<path d="M14 168 Q80 156 206 170 L206 206 L14 206 Z" fill="${P.e}"/>`;
  } else {
    defs += grad(g, [[0, dk2], [1, dk]], true);
    scene += `<rect x="14" y="14" width="192" height="192" fill="url(#${g})"/>`;
    for (let i = 0; i < 30; i++) scene += `<circle cx="${f1(14 + r() * 192)}" cy="${f1(14 + r() * 120)}" r="${f1(0.6 + r() * 1.2)}" fill="#FFFFFF" opacity="${f1(0.4 + r() * 0.6)}"/>`;
    scene += `<circle cx="160" cy="54" r="17" fill="${P.a}"/>`;
    let wire = 'M14 70';
    const bulbs: Array<[number, number]> = [];
    for (let x = 14; x <= 206; x += 8) {
      const t = (x - 110) / 96;
      const y = 70 + 34 * (1 - t * t);
      wire += ` L${x} ${f1(y)}`;
      if ((x - 14) % 24 === 0) bulbs.push([x, y]);
    }
    scene += `<path d="${wire}" fill="none" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1.2"/>`;
    bulbs.forEach(([bx, by], i) => {
      const c = [P.a, P.f, P.d, P.e][i % 4];
      scene += `<circle cx="${bx}" cy="${f1(by + 5)}" r="8" fill="${c}" opacity=".28"/><circle cx="${bx}" cy="${f1(by + 5)}" r="3.6" fill="${c}"/>`;
    });
    scene += `<path d="M14 206 L14 176 Q70 150 120 172 T206 160 L206 206 Z" fill="${P.ink}" opacity=".85"/>`;
  }
  const caption = o.caption ? text(110, 240, o.caption, 25, '#2A2438', { font: HAND, weight: 700 }) : '';
  const body = `<rect x="0" y="0" width="220" height="262" rx="4" fill="#FBFAF7"/><g clip-path="url(#${cl})">${scene}</g><rect x="14" y="14" width="192" height="192" fill="none" stroke="#000000" stroke-opacity=".08"/>${caption}`;
  return { defs, body };
}

function polaroidStack(ctx: Ctx, seed: number, captions: [string, string, string], label?: string): string {
  const scenes: Scene[] = ['night', 'beach', 'rain'];
  const place: Array<[number, number, number]> = [
    [34, 30, -10],
    [92, 20, 8],
    [62, 40, -1],
  ];
  const sh = ctx.id('psh');
  let defs = shadow(sh, 4, 4, 0.4);
  let body = '';
  scenes.forEach((sc, i) => {
    const p = polaroidParts(ctx, { seed: seed + i, scene: sc, caption: captions[i] });
    defs += p.defs;
    body += `<g transform="translate(${place[i][0]} ${place[i][1]}) rotate(${place[i][2]} 90 107) scale(.82)" filter="url(#${sh})">${p.body}</g>`;
  });
  return svg('0 0 300 300', `<defs>${defs}</defs>${body}`, label);
}

function polaroidKit(ctx: Ctx, seed: number, label?: string): string {
  const sh = ctx.id('psh');
  let defs = shadow(sh, 3, 3, 0.4);
  let body = '';
  const sag = (x: number) => 40 + 30 * (1 - Math.pow((x - 150) / 150, 2));
  let wire = 'M0 40';
  for (let x = 0; x <= 300; x += 10) wire += ` L${x} ${f1(sag(x))}`;
  body += `<path d="${wire}" fill="none" stroke="#C9C9D6" stroke-width="1.6"/>`;
  const scenes: Scene[] = ['beach', 'night', 'rain', 'beach'];
  const caps = ['goa trip', 'best night', 'monsoon', 'squad'];
  [42, 112, 188, 258].forEach((cx, i) => {
    const p = polaroidParts(ctx, { seed: seed + i, scene: scenes[i], caption: caps[i] });
    defs += p.defs;
    const y = sag(cx);
    const rot = [-6, 4, -3, 7][i];
    body += `<g transform="translate(${cx - 30} ${f1(y + 6)}) rotate(${rot} 30 36) scale(.27)" filter="url(#${sh})">${p.body}</g>`;
    body += `<rect x="${cx - 3}" y="${f1(y - 6)}" width="6" height="16" rx="1.5" fill="#D9A066"/>`;
  });
  for (let x = 16; x <= 290; x += 22) {
    const c = [P.a, P.f, P.d, P.e][(x / 22) % 4 | 0];
    const y = sag(x) + 6;
    body += `<circle cx="${x}" cy="${f1(y)}" r="7" fill="${c}" opacity=".25"/><circle cx="${x}" cy="${f1(y)}" r="3" fill="${c}"/>`;
  }
  body += text(150, 186, 'WALL KIT', 22, P.a, { font: DISPLAY, spacing: 1 });
  return svg('0 0 300 200', `<defs>${defs}</defs>${body}`, label);
}

/* ---------- sheets, packs, bookmarks ---------- */

function sheet(ctx: Ctx, o: { seed: number; title?: string }, label?: string): string {
  const sh = ctx.id('ss');
  const words = ['yay!', 'to-do', 'focus', 'me time', 'omg', 'slay', 'chai', 'vibe'];
  const cols = [P.a, P.f, P.c, P.d, P.e, P.b];
  const r = rng(o.seed);
  const off = Math.floor(r() * 6);
  let s = `<defs>${shadow(sh, 4, 4, 0.4)}</defs><g filter="url(#${sh})"><rect x="10" y="6" width="180" height="248" rx="10" fill="#FBFAF7"/></g>`;
  s += text(100, 32, (o.title ?? 'main character').toLowerCase(), 17, P.ink, { font: HAND, weight: 700 });
  let k = Math.floor(r() * words.length);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = 44 + col * 56;
      const cy = 74 + row * 50;
      const i = row * 3 + col;
      const c = cols[(i + off) % cols.length];
      const t = (i + row + off) % 4;
      let geo: string;
      if (t === 0) geo = `<path d="${heart(cx, cy + 2, 19)}"/>`;
      else if (t === 1) geo = `<path d="${star(cx, cy + 1, 21, 10, 5)}"/>`;
      else if (t === 2) geo = `<rect x="${cx - 25}" y="${cy - 12}" width="50" height="24" rx="12"/>`;
      else geo = `<path d="${scallop(cx, cy, 20, 8, 0.16)}"/>`;
      s += `<g fill="#FFFFFF" stroke="#000000" stroke-opacity=".12" stroke-width="9" stroke-linejoin="round">${geo}</g><g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="7" stroke-linejoin="round">${geo}</g><g fill="${c}">${geo}</g>`;
      if (t === 2) s += text(cx, cy + 1, words[k++ % words.length], 10, textOn(c), { font: SANS, weight: 800, central: true });
    }
  }
  return svg('0 0 200 262', s, label);
}

function pack(ctx: Ctx, o: { seed: number; word?: string; motif?: Motif }, label?: string): string {
  const r = rng(o.seed);
  const pairs: Array<[PaletteKey, PaletteKey]> = [['a', 'd'], ['f', 'c'], ['e', 'b'], ['d', 'c'], ['b', 'f']];
  const shapes: StickerShape[] = ['badge', 'star', 'blob'];
  let defs = '';
  let body = '';
  const place: Array<[number, number, number]> = [
    [10, 46, -14],
    [104, 30, 10],
    [56, 96, -4],
  ];
  place.forEach(([x, y, rot], i) => {
    const pr = pairs[Math.floor(r() * pairs.length)];
    // The first two stickers show the theme's symbol, when there is one.
    const part = stickerParts(ctx, { shape: shapes[i], word: i === 2 ? o.word : undefined, c1: pr[0], c2: pr[1], seed: o.seed + i, motif: i < 2 ? o.motif : undefined });
    defs += part.defs;
    body += `<g transform="translate(${x} ${y}) rotate(${rot} 100 100) scale(.62)">${part.body}</g>`;
  });
  body += `<g transform="translate(206 22) rotate(8)"><rect width="78" height="34" rx="17" fill="${P.a}"/>${text(39, 18, 'PACK', 20, P.ink, { central: true, spacing: 1 })}</g>`;
  return svg('0 0 300 260', `<defs>${defs}</defs>${body}`, label);
}

function bookmark(ctx: Ctx, o: { seed: number; title?: string }, label?: string): string {
  const sh = ctx.id('bs');
  const mk = ctx.id('bm');
  const r = rng(o.seed);
  const body = [P.c, P.b, '#123A5A', '#0F3D33'][Math.floor(r() * 4)];
  let m = '';
  const ring = (n: number, dist: number, rx: number, ry: number, color: string, rot = 0) => {
    for (let i = 0; i < n; i++) m += `<ellipse cx="80" cy="${108 - dist}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${f1(rot + (i * 360) / n)} 80 108)"/>`;
  };
  ring(12, 27, 7, 16, P.a);
  ring(8, 14, 6, 11, P.f, 22.5);
  m += `<circle cx="80" cy="108" r="9" fill="${P.e}"/><circle cx="80" cy="108" r="4" fill="${P.paper}"/>`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    m += `<circle cx="${f1(80 + Math.cos(a) * 44)}" cy="${f1(108 + Math.sin(a) * 44)}" r="2.2" fill="${P.paper}" opacity=".9"/>`;
  }
  const t = (o.title ?? 'READ MORE').toUpperCase();
  const s = `<defs>${shadow(sh, 4, 4, 0.45)}<mask id="${mk}"><rect x="0" y="0" width="160" height="290" fill="#FFFFFF"/><circle cx="80" cy="30" r="5.5" fill="#000000"/></mask></defs>
    <g filter="url(#${sh})"><rect x="34" y="14" width="92" height="256" rx="8" fill="${body}" mask="url(#${mk})"/></g>${m}
    ${text(0, 0, t, Math.min(20, Math.round(124 / (t.length * WF))), textOn(body), { central: true, transform: 'translate(80 212) rotate(-90)' })}
    <path d="M80 30 C90 18 100 10 110 4" stroke="${P.f}" stroke-width="2.6" fill="none" stroke-linecap="round"/><g stroke="${P.f}" stroke-width="2.2" stroke-linecap="round"><path d="M110 4 l10 -2"/><path d="M110 4 l9 4"/><path d="M110 4 l6 8"/></g>`;
  return svg('0 0 160 290', s, label);
}

/* ---------- multi-poster compositions ---------- */

const POSTER_KINDS: PosterKind[] = ['speed', 'sunset', 'orbit', 'bloom', 'grid', 'wave'];

function split(ctx: Ctx, o: PosterOpts, label?: string): string {
  const p = posterParts(ctx, { ...o, frame: 'none' });
  const sh = ctx.id('psh');
  // A landscape window across the middle of the poster, split into three panels.
  const panelW = 100;
  const panelH = 210;
  let body = '';
  for (let i = 0; i < 3; i++) {
    body += `<g filter="url(#${sh})"><svg x="${8 + i * 98}" y="20" width="90" height="190" viewBox="${i * panelW} 110 ${panelW} ${panelH}" preserveAspectRatio="xMidYMid slice">${p.body}</svg></g>`;
  }
  return svg('0 0 310 230', `<defs>${p.defs}${shadow(sh, 4, 4, 0.45)}</defs>${body}`, label);
}

function posterSet(ctx: Ctx, o: PosterOpts, label?: string): string {
  const sh = ctx.id('psh');
  let defs = shadow(sh, 5, 5, 0.45);
  let body = '';
  const kinds = [POSTER_KINDS[(o.seed + 1) % 6], o.kind, POSTER_KINDS[(o.seed + 3) % 6]];
  const place: Array<[number, number, number]> = [
    [18, 34, -10],
    [100, 16, 0],
    [182, 34, 10],
  ];
  kinds.forEach((kind, i) => {
    const n = nestedPoster(ctx, { kind, seed: o.seed + i * 7, title: i === 1 ? o.title : undefined }, 0, 0, 100, 141);
    defs += n.defs;
    body += `<g transform="translate(${place[i][0]} ${place[i][1]}) rotate(${place[i][2]} 50 70)" filter="url(#${sh})">${n.body}</g>`;
  });
  return svg('0 0 300 220', `<defs>${defs}</defs>${body}`, label);
}

function collage(ctx: Ctx, o: PosterOpts, count: 4 | 9, label?: string): string {
  const r = rng(o.seed);
  const sh = ctx.id('psh');
  let defs = shadow(sh, 3, 3, 0.45);
  let body = '';
  const cols = count === 9 ? 3 : 2;
  const cw = count === 9 ? 74 : 104;
  const ch = Math.round(cw * 1.41);
  const gap = count === 9 ? 12 : 18;
  const totalW = cols * cw + (cols - 1) * gap;
  const x0 = (300 - totalW) / 2;
  for (let i = 0; i < count; i++) {
    const kind = POSTER_KINDS[Math.floor(r() * POSTER_KINDS.length)];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const n = nestedPoster(ctx, { kind, seed: o.seed + i * 13, title: i === 0 ? o.title : undefined }, 0, 0, cw, ch);
    defs += n.defs;
    const rot = f1((r() - 0.5) * 6);
    body += `<g transform="translate(${f1(x0 + col * (cw + gap))} ${f1(14 + row * (ch + gap))}) rotate(${rot} ${cw / 2} ${ch / 2})" filter="url(#${sh})"><rect x="-3" y="-3" width="${cw + 6}" height="${ch + 6}" fill="#F4F2EE"/>${n.body}</g>`;
  }
  const rows = Math.ceil(count / cols);
  const h = 28 + rows * ch + (rows - 1) * gap;
  return svg(`0 0 300 ${h}`, `<defs>${defs}</defs>${body}`, label);
}

/* ---------- small goods ---------- */

function postcard(ctx: Ctx, o: PosterOpts, label?: string): string {
  const sh = ctx.id('psh');
  const n = nestedPoster(ctx, { ...o, frame: 'none' }, 14, 14, 272, 172, true);
  const stamp = `<g transform="translate(236 22) rotate(6)"><rect width="38" height="46" fill="#FBFAF7" stroke="${P.ink}" stroke-opacity=".25" stroke-dasharray="3 2"/><rect x="5" y="5" width="28" height="36" fill="${P.b}"/>${text(19, 23, '₹5', 12, '#FFFFFF', { central: true })}</g>`;
  return svg('0 0 300 200', `<defs>${n.defs}${shadow(sh, 4, 4, 0.45)}</defs><g filter="url(#${sh})"><rect width="300" height="200" rx="4" fill="#FBFAF7"/></g>${n.body}${stamp}`, label);
}

function keychain(ctx: Ctx, o: StickerOpts, label?: string): string {
  const part = stickerParts(ctx, o);
  const acr = ctx.id('ac');
  const ring = `<circle cx="100" cy="30" r="20" fill="none" stroke="#C9CCD6" stroke-width="5"/><circle cx="100" cy="30" r="20" fill="none" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1.5"/>`;
  const chain = `<g fill="none" stroke="#B7BAC6" stroke-width="3.5"><ellipse cx="100" cy="58" rx="5" ry="8"/><ellipse cx="100" cy="72" rx="3" ry="6" transform="rotate(90 100 72)"/></g>`;
  const acrylic = `<rect x="22" y="78" width="156" height="156" rx="34" fill="url(#${acr})" stroke="#FFFFFF" stroke-opacity=".5"/>`;
  return svg(
    '0 0 200 250',
    `<defs>${part.defs}<linearGradient id="${acr}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity=".06"/></linearGradient></defs>${ring}${chain}${acrylic}<g transform="translate(30 86) scale(.7)">${part.body}</g>`,
    label,
  );
}

function badge(ctx: Ctx, o: PosterOpts & { word?: string }, label?: string): string {
  const cl = ctx.id('bc');
  const rim = ctx.id('br');
  const sh = ctx.id('bsh');
  const n = nestedPoster(ctx, { ...o, frame: 'none' }, 20, 20, 160, 160, true);
  const word = o.word ? text(100, 150, o.word.toUpperCase(), fit(o.word, 28, 110), '#FFFFFF', { central: true }) : '';
  return svg(
    '0 0 200 200',
    `<defs>${n.defs}<clipPath id="${cl}"><circle cx="100" cy="100" r="80"/></clipPath>${grad(rim, [[0, '#F1F2F6'], [0.5, '#8E92A3'], [1, '#E2E4EA']])}${shadow(sh, 5, 5, 0.5)}</defs>
     <circle cx="100" cy="100" r="88" fill="url(#${rim})" filter="url(#${sh})"/><g clip-path="url(#${cl})">${n.body}</g>${word}
     <path d="M44 66 A64 64 0 0 1 120 38" fill="none" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="7" stroke-linecap="round"/>`,
    label,
  );
}

function phoneSkin(ctx: Ctx, o: PosterOpts, label?: string): string {
  const cl = ctx.id('ph');
  const sh = ctx.id('phs');
  const n = nestedPoster(ctx, { ...o, frame: 'none' }, 50, 10, 120, 240, true);
  return svg(
    '0 0 220 260',
    `<defs>${n.defs}<clipPath id="${cl}"><rect x="50" y="10" width="120" height="240" rx="22"/></clipPath>${shadow(sh, 6, 6, 0.5)}</defs>
     <rect x="47" y="7" width="126" height="246" rx="24" fill="#2B2B38" filter="url(#${sh})"/><g clip-path="url(#${cl})">${n.body}</g>
     <rect x="60" y="22" width="44" height="52" rx="12" fill="#14141C" opacity=".92"/><circle cx="74" cy="36" r="8" fill="#050508" stroke="#3A3A4A" stroke-width="2"/><circle cx="74" cy="60" r="8" fill="#050508" stroke="#3A3A4A" stroke-width="2"/><circle cx="94" cy="36" r="3" fill="#E8E2C8"/>`,
    label,
  );
}

function laptopSkin(ctx: Ctx, o: PosterOpts, label?: string): string {
  const cl = ctx.id('lp');
  const sh = ctx.id('lps');
  const n = nestedPoster(ctx, { ...o, frame: 'none' }, 20, 20, 260, 170, true);
  return svg(
    '0 0 300 220',
    `<defs>${n.defs}<clipPath id="${cl}"><rect x="20" y="20" width="260" height="170" rx="12"/></clipPath>${shadow(sh, 6, 6, 0.5)}</defs>
     <rect x="16" y="16" width="268" height="178" rx="14" fill="#2B2B38" filter="url(#${sh})"/><g clip-path="url(#${cl})">${n.body}</g>
     <circle cx="150" cy="105" r="13" fill="#2B2B38" opacity=".85"/><rect x="10" y="194" width="280" height="10" rx="5" fill="#3A3A4A"/>`,
    label,
  );
}

function decal(ctx: Ctx, o: { seed: number; word?: string; c1: PaletteKey; motif?: Motif }, label?: string): string {
  const r = rng(o.seed);
  const word = (o.word ?? 'FULL SEND').toUpperCase();
  const color = ctx.col(o.c1);
  let stripes = '';
  for (let i = 0; i < 5; i++) stripes += `<rect x="${f1(20 + i * 10)}" y="${f1(118 + i * 9)}" width="${f1(150 - i * 22 + r() * 10)}" height="5" fill="${i % 2 ? '#FFFFFF' : color}"/>`;
  // With a symbol, it sits to the left and the word moves right to make room.
  const size = o.motif ? tsize(word, 52, 170) : tsize(word, 64, 250);
  const wordX = o.motif ? 190 : 150;
  const symbol = o.motif ? drawMotif(o.motif, 62, 84, 76, color, '#1C1C2A') : '';
  return svg(
    '0 0 300 200',
    `<rect width="300" height="200" rx="16" fill="#1C1C2A"/><path d="M0 150 Q150 128 300 150 L300 200 L0 200 Z" fill="#14141F"/>
     ${symbol}<g transform="skewX(-12) translate(22 0)">${text(wordX, 96, word, size, 'none', { central: true })
       .replace('fill="none"', `fill="${color}" stroke="#FFFFFF" stroke-width="3" paint-order="stroke"`)}${stripes}</g>`,
    label,
  );
}

/* ---------- mockups for the product gallery ---------- */

function wall(ctx: Ctx, o: PosterOpts, label?: string): string {
  const pp = posterParts(ctx, o);
  const g = ctx.id('wl');
  const sh = ctx.id('ws');
  const ph = 156;
  const pw = (ph * pp.w) / pp.h;
  return svg(
    '0 0 400 400',
    `<defs>${grad(g, [[0, '#1E1E2C'], [1, '#14141E']], true)}${pp.defs}${shadow(sh, 6, 6, 0.55)}</defs>
     <rect width="400" height="400" fill="url(#${g})"/><rect y="318" width="400" height="82" fill="#0E0E16"/><rect y="311" width="400" height="8" fill="#24243A"/>
     <g filter="url(#${sh})"><svg x="${f1(200 - pw / 2)}" y="48" width="${f1(pw)}" height="${ph}" viewBox="${pp.vb}">${pp.body}</svg></g>
     <g><rect x="78" y="252" width="244" height="58" rx="16" fill="#3B2A6B"/><rect x="62" y="262" width="42" height="62" rx="14" fill="#3B2A6B"/><rect x="296" y="262" width="42" height="62" rx="14" fill="#3B2A6B"/><rect x="92" y="236" width="104" height="42" rx="14" fill="#4A3685"/><rect x="204" y="236" width="104" height="42" rx="14" fill="#4A3685"/><rect x="84" y="322" width="8" height="18" fill="#0B0B12"/><rect x="308" y="322" width="8" height="18" fill="#0B0B12"/></g>`,
    label,
    'fill',
  );
}

function onLaptop(ctx: Ctx, inner: { defs: string; body: string }, label?: string): string {
  const g = ctx.id('lg');
  return svg(
    '0 0 400 400',
    `<defs>${grad(g, [[0, '#3A3A4A'], [1, '#26262F']])}${inner.defs}</defs>
     <rect width="400" height="400" fill="#14141E"/><rect x="40" y="70" width="320" height="214" rx="16" fill="url(#${g})"/><circle cx="200" cy="177" r="15" fill="#2D2D38"/>
     <path d="M24 300 L376 300 L360 322 L40 322 Z" fill="#30303C"/><rect x="170" y="300" width="60" height="6" rx="3" fill="#24242E"/>
     <g transform="translate(232 150) rotate(-8) scale(.5)">${inner.body}</g>`,
    label,
    'fill',
  );
}

function sizeGuide(label?: string): string {
  const k = 0.4;
  const x0 = 54;
  const y0 = 296;
  let s = '';
  const sizes: Array<[string, number, number, string]> = [
    ['A2', 420, 594, P.f],
    ['A3', 297, 420, P.d],
    ['A4', 210, 297, P.a],
  ];
  sizes.forEach(([n, w, h, c]) => {
    const W = w * k;
    const H = h * k;
    s += `<rect x="${x0}" y="${f1(y0 - H)}" width="${f1(W)}" height="${f1(H)}" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-width="1.6"/>`;
    s += text(x0 + W - 8, y0 - H + 22, n, 18, P.fg, { anchor: 'end' });
  });
  s += `<g style="font-family:${SANS}" font-size="11.5" font-weight="700" fill="${P.fg}"><text x="${x0}" y="${y0 + 24}">A4 · 21 × 29.7 cm</text><text x="${x0 + 118}" y="${y0 + 24}">A3 · 29.7 × 42 cm</text><text x="${x0}" y="${y0 + 42}">A2 · 42 × 59.4 cm (drawn to scale)</text></g>`;
  return svg('0 0 300 350', s, label ?? 'Poster size guide with A4, A3 and A2 drawn to scale');
}

/* ---------- public API ---------- */

const STICKER_VARIANT: Partial<Record<ArtKind, StickerOpts['variant']>> = {
  sticker: 'plain',
  holo: 'holo',
  clear: 'clear',
  motion: 'motion',
  dome: 'dome',
  magnet: 'magnet',
};

export interface RenderOptions {
  /** Accessible name; omit for decorative art. */
  label?: string;
  /** Overrides the frame (product page option). */
  frame?: FrameColor;
  /** Extra salt for SVG ids when the same art appears twice on a page. */
  idPrefix?: string;
}

function ctxFor(spec: ArtSpec, opts: RenderOptions): Ctx {
  const prefix = `${opts.idPrefix ?? ''}a${hashString(JSON.stringify(spec) + (opts.frame ?? '')).toString(36)}`;
  return new Ctx(prefix, spec.dark ?? spec.seed);
}

function stickerOpts(spec: ArtSpec): StickerOpts {
  return {
    shape: spec.shape ?? 'blob',
    word: spec.word,
    c1: spec.c1 ?? 'a',
    c2: spec.c2 ?? 'd',
    seed: spec.seed,
    variant: STICKER_VARIANT[spec.kind] ?? 'plain',
    motif: motifOf(spec),
  };
}

/** The design's symbol, if it names one this version knows (designs are stored data). */
const motifOf = (spec: ArtSpec): Motif | undefined => (isMotif(spec.motif) ? spec.motif : undefined);

function posterOpts(spec: ArtSpec, frame?: FrameColor): PosterOpts {
  return { kind: spec.poster ?? 'speed', seed: spec.seed, title: spec.title, frame: frame ?? spec.frame, motif: motifOf(spec) };
}

/** Render a product's placeholder artwork as an inline SVG string. */
export function renderArt(spec: ArtSpec, opts: RenderOptions = {}): string {
  const ctx = ctxFor(spec, opts);
  const label = opts.label;
  switch (spec.kind) {
    case 'sticker':
    case 'holo':
    case 'clear':
    case 'motion':
    case 'dome':
    case 'magnet':
      return sticker(ctx, stickerOpts(spec), label);
    case 'decal':
      return decal(ctx, { seed: spec.seed, word: spec.word, c1: spec.c1 ?? 'a', motif: motifOf(spec) }, label);
    case 'sheet':
      return sheet(ctx, { seed: spec.seed, title: spec.title }, label);
    case 'pack':
      return pack(ctx, { seed: spec.seed, word: spec.word, motif: motifOf(spec) }, label);
    case 'poster':
      return poster(ctx, posterOpts(spec, opts.frame), label);
    case 'framed':
      return poster(ctx, posterOpts(spec, opts.frame && opts.frame !== 'none' ? opts.frame : spec.frame ?? 'black'), label);
    case 'split':
      return split(ctx, posterOpts(spec), label);
    case 'poster-set':
      return posterSet(ctx, posterOpts(spec), label);
    case 'collage':
      return collage(ctx, posterOpts(spec), 9, label);
    case 'mini-posters':
      return collage(ctx, posterOpts(spec), 4, label);
    case 'polaroids':
      return polaroidStack(ctx, spec.seed, [spec.caption ?? 'best night', 'beach day', 'monsoon mood'], label);
    case 'polaroid-kit':
      return polaroidKit(ctx, spec.seed, label);
    case 'bookmark':
      return bookmark(ctx, { seed: spec.seed, title: spec.title }, label);
    case 'postcard':
      return postcard(ctx, posterOpts(spec), label);
    case 'keychain':
      return keychain(ctx, stickerOpts({ ...spec, kind: 'sticker' }), label);
    case 'badge':
      return badge(ctx, { ...posterOpts(spec), word: spec.word }, label);
    case 'phone-skin':
      return phoneSkin(ctx, posterOpts(spec), label);
    case 'laptop-skin':
      return laptopSkin(ctx, posterOpts(spec), label);
  }
}

export type GalleryView = 'art' | 'laptop' | 'wall' | 'closeup' | 'sizes';

const POSTER_LIKE: ReadonlySet<ArtKind> = new Set(['poster', 'framed']);
const STICKER_LIKE: ReadonlySet<ArtKind> = new Set(['sticker', 'holo', 'clear', 'motion', 'dome', 'magnet']);

/** Which gallery images a product gets on its product page. */
export function galleryViews(kind: ArtKind): GalleryView[] {
  if (POSTER_LIKE.has(kind)) return ['art', 'wall', 'closeup', 'sizes'];
  if (STICKER_LIKE.has(kind)) return ['art', 'laptop', 'closeup'];
  return ['art', 'closeup'];
}

/** Render one of the gallery views for a product. */
export function renderGalleryView(spec: ArtSpec, view: GalleryView, opts: RenderOptions = {}): string {
  const ctx = ctxFor(spec, { ...opts, idPrefix: (opts.idPrefix ?? '') + view });
  const label = opts.label;
  switch (view) {
    case 'art':
      return renderArt(spec, { ...opts, idPrefix: `${opts.idPrefix ?? ''}art` });
    case 'wall': {
      const frame = spec.kind === 'framed' ? (opts.frame && opts.frame !== 'none' ? opts.frame : spec.frame ?? 'black') : opts.frame ?? 'none';
      return wall(ctx, posterOpts(spec, frame), label);
    }
    case 'laptop':
      return onLaptop(ctx, stickerParts(ctx, stickerOpts(spec)), label);
    case 'sizes':
      return sizeGuide(label);
    case 'closeup': {
      if (POSTER_LIKE.has(spec.kind)) return poster(ctx, { ...posterOpts(spec, 'none'), vb: '30 110 240 240' }, label, 'fill');
      const inner = renderArt(spec, { ...opts, idPrefix: `${opts.idPrefix ?? ''}cu` });
      return inner.replace(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/, (_m, x, y, w, h) => {
        const nx = Number(x) + Number(w) * 0.18;
        const ny = Number(y) + Number(h) * 0.18;
        return `viewBox="${f1(nx)} ${f1(ny)} ${f1(Number(w) * 0.64)} ${f1(Number(h) * 0.64)}"`;
      });
    }
  }
}
