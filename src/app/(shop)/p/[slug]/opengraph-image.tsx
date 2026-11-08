import { ImageResponse } from 'next/og';
import { getProduct } from '@/lib/catalog/queries';
import { photoUploadId } from '@/lib/catalog/images';
import { formatINR } from '@/lib/money';
import { onlinePayments } from '@/lib/payments/methods';
import { Brand, C, OG_SIZE, ogFonts, Price, Stripes } from '@/lib/og';
import { readPreview } from '@/lib/uploads';

export const alt = 'A design from PrintYourVibe';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** The product's first photo as a JPEG for the card (the renderer can't read WebP). */
async function photo(src: string | undefined): Promise<string | null> {
  const id = src ? photoUploadId(src) : null;
  const file = id ? await readPreview(id, 'preview') : null;
  if (!file) return null;
  const { default: sharp } = await import('sharp');
  const jpeg = await sharp(file.data).flatten({ background: C.surface }).resize(560, 560, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/** The card shown when a product link is shared: its photo, name, type, starting price and the brand. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, fonts] = await Promise.all([getProduct(slug), ogFonts()]);
  const picture = product ? await photo(product.images[0]) : null;
  const name = product?.name ?? 'PrintYourVibe';
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: C.bg, fontFamily: 'Barlow', color: C.ink, overflow: 'hidden' }}>
        <Stripes />
        <div style={{ position: 'absolute', left: -160, top: -200, width: 620, height: 620, borderRadius: 620, background: 'radial-gradient(circle, rgba(139,92,255,0.35), rgba(11,11,18,0))', display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 64px 56px', width: picture ? 640 : 1100, position: 'relative' }}>
          <Brand />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {product && <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: C.lime }}>{product.typeName}</div>}
            <div style={{ fontFamily: 'Anton', fontSize: name.length > 22 ? 76 : 96, lineHeight: 1.02, textTransform: 'uppercase', marginTop: 12 }}>{name}</div>
            {product && product.vibes.length > 0 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                {product.vibes.slice(0, 3).map((v) => (
                  <div key={v.id} style={{ display: 'flex', border: `2px solid ${C.line}`, borderRadius: 4, padding: '6px 14px', fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.muted }}>
                    {v.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {product ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ fontSize: 30, fontWeight: 500, color: C.muted }}>from</span>
              <Price text={formatINR(product.priceFrom)} size={64} color={C.lime} />
              <span style={{ fontSize: 24, fontWeight: 500, color: C.muted, marginLeft: 10 }}>{onlinePayments() ? 'UPI · Cards · Cash on Delivery' : 'Cash on Delivery'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 30, color: C.muted }}>Stickers, posters and polaroids, printed in India</div>
          )}
        </div>
        {picture && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 560, padding: 40, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 480, height: 480, background: C.surface, border: `3px solid ${C.lime}`, borderRadius: 18, boxShadow: '0 0 60px rgba(198,255,61,0.25)' }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- drawn into an image, not a page */}
              <img src={picture} width={440} height={440} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
