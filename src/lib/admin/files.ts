import 'server-only';
import { strToU8, zipSync, type Zippable } from 'fflate';
import { frameAspect, designSummary } from '@/lib/custom/studios';
import { printRegion } from '@/lib/custom/print';
import { MAX_UPLOAD_PIXELS, minZoomFor } from '@/lib/custom/types';
import type { OrderView } from '@/lib/orders/types';
import { getStorage } from '@/lib/storage';
import { getUpload } from '@/lib/uploads';

/**
 * Customer files for printing: the untouched originals, print files with the
 * shopper's crop applied at full resolution, and a zip of everything.
 */

export interface FileOut {
  data: Buffer;
  name: string;
  type: string;
}

const safe = (s: string) => s.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file';
const extOf = (type: string) => (type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg');

export async function originalFile(uploadId: string): Promise<FileOut | null> {
  const row = await getUpload(uploadId);
  if (!row || row.status !== 'ready') return null;
  const data = await getStorage().get(row.originalKey);
  if (!data) return null;
  const base = safe(row.name.replace(/\.[^.]+$/, ''));
  return { data, name: `${base}.${extOf(row.contentType)}`, type: row.contentType };
}

/** The print file for one image of one order item: cropped (or placed on white) at full resolution. */
export async function printFile(order: OrderView, itemIndex: number, photoIndex: number): Promise<FileOut | null> {
  const item = order.items[itemIndex];
  const design = item?.custom;
  const di = design?.items[photoIndex];
  if (!item || !design || !di) return null;
  const row = await getUpload(di.upload.id);
  if (!row || row.status !== 'ready' || !row.width || !row.height) return null;
  const original = await getStorage().get(row.originalKey);
  if (!original) return null;

  const { default: sharp } = await import('sharp');
  const region = printRegion({ w: row.width, h: row.height }, frameAspect(design.kind, item.options), di.crop, minZoomFor(design.kind));
  let image = sharp(original, { limitInputPixels: MAX_UPLOAD_PIXELS, autoOrient: true });
  if (region.extract) image = sharp(await image.extract(region.extract).toBuffer());
  if (region.place) {
    const part = await image.toBuffer();
    image = sharp({ create: { width: region.width, height: region.height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).composite([
      { input: part, left: region.place.left, top: region.place.top },
    ]);
  }
  // Stickers keep transparency (PNG); photos print from a high-quality JPEG.
  const png = design.kind === 'stickers';
  const data = png ? await image.png().toBuffer() : await image.flatten({ background: '#ffffff' }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  return { data, name: `${order.number}-item${itemIndex + 1}-${photoIndex + 1}-print.${png ? 'png' : 'jpg'}`, type: png ? 'image/png' : 'image/jpeg' };
}

/** Everything the printer needs for an order's custom items, in one zip. */
export async function orderZip(order: OrderView): Promise<Uint8Array | null> {
  const files: Zippable = {};
  const notes: string[] = [`Order ${order.number}`, `Customer: ${order.name}, ${order.phone}`, ''];
  for (const [i, item] of order.items.entries()) {
    const d = item.custom;
    if (!d) continue;
    const folder = `item-${i + 1}-${d.kind}`;
    notes.push(`Item ${i + 1}: ${item.name} x ${item.qty}`, `  ${item.optionLabels.join(', ')}`, `  ${designSummary(d, item.options)}`);
    if (d.note) notes.push(`  Note from the customer: ${d.note}`);
    for (const [j, di] of d.items.entries()) {
      const n = String(j + 1).padStart(2, '0');
      const [orig, print] = await Promise.all([originalFile(di.upload.id), printFile(order, i, j)]);
      if (orig) files[`${folder}/${n}-original-${orig.name}`] = [new Uint8Array(orig.data), { level: 0 }];
      if (print) files[`${folder}/${n}-print.${print.name.split('.').pop()}`] = [new Uint8Array(print.data), { level: 0 }];
      notes.push(`  ${n}: ${di.upload.name} (${di.upload.w} x ${di.upload.h} px)${di.caption ? `, caption "${di.caption}"` : ''}${di.crop ? `, crop centre ${di.crop.x}, ${di.crop.y}, zoom ${di.crop.zoom}` : ''}`);
    }
    notes.push('');
  }
  if (!Object.keys(files).length) return null;
  files['design.txt'] = strToU8(notes.join('\n'));
  return zipSync(files);
}
