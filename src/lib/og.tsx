import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Share images: the 1200 × 630 cards WhatsApp, Instagram and X show for a
 * link. Built with next/og, which needs real font files (not the web fonts
 * the pages load) and inline styles with flexbox only.
 */

export const OG_SIZE = { width: 1200, height: 630 };

export const C = { bg: '#0b0b12', surface: '#15151f', line: '#2a2a3d', ink: '#f5f5f7', muted: '#a3a3ba', lime: '#c6ff3d', red: '#ff2e4d', violet: '#8b5cff', cyan: '#2de2e6' };

type OgFont = { name: string; data: Buffer; weight: 400 | 500 | 700; style: 'normal' };

let fonts: Promise<OgFont[]> | null = null;

/** Anton for headings and prices, Barlow for text. "AntonExt" has the ₹ sign, which the basic files lack. Read once. */
export function ogFonts(): Promise<OgFont[]> {
  // The font files are read at run time from the project folder, not bundled (the comments tell the bundler so).
  const dir = join(/*turbopackIgnore: true*/ process.cwd(), 'src/assets/fonts');
  fonts ??= Promise.all(['anton-400.woff', 'anton-400-ext.woff', 'barlow-500.woff', 'barlow-700.woff'].map((f) => readFile(/*turbopackIgnore: true*/ join(/*turbopackIgnore: true*/ dir, f)))).then(([anton, antonExt, b500, b700]) => [
    { name: 'Anton', data: anton, weight: 400, style: 'normal' },
    { name: 'AntonExt', data: antonExt, weight: 400, style: 'normal' },
    { name: 'Barlow', data: b500, weight: 500, style: 'normal' },
    { name: 'Barlow', data: b700, weight: 700, style: 'normal' },
  ]);
  return fonts;
}

/** A price like ₹1,299 in Anton, with the ₹ sign taken from the extended font file. */
export function Price({ text, size, color }: { text: string; size: number; color: string }) {
  const rupee = text.startsWith('₹');
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', fontSize: size, color, lineHeight: 1 }}>
      {rupee && <span style={{ fontFamily: 'AntonExt' }}>₹</span>}
      <span style={{ fontFamily: 'Anton' }}>{rupee ? text.slice(1) : text}</span>
    </div>
  );
}

/** The "//PRINTYOURVIBE" mark. */
export function Brand({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Anton', fontSize: size, letterSpacing: 1, color: C.ink }}>
      <span style={{ color: C.lime, marginRight: 4 }}>{'//'}</span>PRINTYOURVIBE
    </div>
  );
}

/** Diagonal racing stripes, the theme's signature, behind the card's right side. */
export function Stripes() {
  return (
    <div
      style={{
        position: 'absolute',
        right: -120,
        top: 0,
        width: 620,
        height: 630,
        display: 'flex',
        opacity: 0.35,
        backgroundImage: `repeating-linear-gradient(115deg, transparent 0px, transparent 26px, ${C.line} 26px, ${C.line} 52px)`,
      }}
    />
  );
}
