import { ImageResponse } from 'next/og';
import { Brand, C, OG_SIZE, ogFonts, Stripes } from '@/lib/og';
import { onlinePayments } from '@/lib/payments/methods';

export const alt = 'PrintYourVibe: stickers, posters and polaroids for every fandom';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** The card shown when any page without its own card is shared. */
export default async function Image() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', background: C.bg, padding: 72, fontFamily: 'Barlow', color: C.ink, overflow: 'hidden' }}>
        <Stripes />
        <div style={{ position: 'absolute', right: -120, bottom: -220, width: 640, height: 640, borderRadius: 640, background: 'radial-gradient(circle, rgba(198,255,61,0.25), rgba(11,11,18,0))', display: 'flex' }} />
        <Brand size={40} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: 'Anton', fontSize: 108, lineHeight: 1, textTransform: 'uppercase' }}>Stickers, posters</div>
          <div style={{ fontFamily: 'Anton', fontSize: 108, lineHeight: 1, textTransform: 'uppercase', color: C.lime }}>&amp; polaroids</div>
          <div style={{ fontSize: 34, fontWeight: 500, color: C.muted, marginTop: 22 }}>For every fandom and mood. Or upload your own.</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
          {(onlinePayments() ? ['Printed in India', 'UPI & cards', 'Cash on Delivery'] : ['Printed in India', 'Cash on Delivery', 'Ships across India']).map((t) => (
            <div key={t} style={{ display: 'flex', border: `2px solid ${C.line}`, borderRadius: 4, padding: '8px 16px', color: C.ink }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
