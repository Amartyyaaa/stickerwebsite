import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = (w: number, h: number, body: string) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

/** Makes the pictures the tests upload: a transparent logo, photos, a small and a rotated JPEG, and a fake PNG. */
export async function makeTestImages(out: string) {
  mkdirSync(out, { recursive: true });
  // A transparent PNG logo, 1400 px: a star with a word (good for die-cut stickers).
  await sharp(
    svg(
      1400,
      1400,
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fd8"/><stop offset="1" stop-color="#8b5cff"/></linearGradient></defs>
<path d="M700 80 L860 520 L1320 540 L960 820 L1090 1280 L700 1010 L310 1280 L440 820 L80 540 L540 520 Z" fill="url(#g)"/>
<text x="700" y="800" font-family="Arial Black, Arial" font-weight="900" font-size="230" text-anchor="middle" fill="#c6ff3d">YAY</text>`,
    ),
  )
    .png()
    .toFile(`${out}/logo-transparent.png`);
  // A small JPEG, 400 × 300.
  await sharp(svg(400, 300, `<rect width="400" height="300" fill="#2de2e6"/><circle cx="200" cy="150" r="110" fill="#ff2e4d"/><text x="200" y="170" font-size="60" text-anchor="middle" font-family="Arial" fill="#fff">LOW</text>`))
    .jpeg({ quality: 85 })
    .toFile(`${out}/small.jpg`);
  // A landscape photo-like JPEG, 3000 × 2000.
  await sharp(
    svg(
      3000,
      2000,
      `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9f1c"/><stop offset="0.6" stop-color="#ff2e4d"/><stop offset="1" stop-color="#2a1040"/></linearGradient></defs><rect width="3000" height="2000" fill="url(#s)"/><circle cx="1500" cy="1250" r="520" fill="#ffd166"/><rect y="1450" width="3000" height="550" fill="#14141e"/><text x="1500" y="700" font-size="260" text-anchor="middle" font-family="Arial Black, Arial" fill="#fff">GOA 2026</text>`,
    ),
  )
    .jpeg({ quality: 88 })
    .toFile(`${out}/landscape.jpg`);
  // Twelve numbered photos, 1200 × 1500, in different colours.
  const colours = ['#c6ff3d', '#ff2e4d', '#8b5cff', '#2de2e6', '#ff9f1c', '#ff4fd8', '#5eead4', '#fde047', '#60a5fa', '#f87171', '#a3e635', '#c084fc'];
  for (const [i, c] of colours.entries()) {
    await sharp(
      svg(1200, 1500, `<rect width="1200" height="1500" fill="${c}"/><circle cx="600" cy="640" r="380" fill="#0b0b12" fill-opacity=".85"/><text x="600" y="720" font-size="260" text-anchor="middle" font-family="Arial Black, Arial" fill="${c}">${i + 1}</text>`),
    )
      .jpeg({ quality: 82 })
      .toFile(`${out}/photo-${String(i + 1).padStart(2, '0')}.jpg`);
  }
  // A text file pretending to be a PNG.
  writeFileSync(`${out}/fake.png`, 'this is not an image\n'.repeat(50));
  // A JPEG with EXIF orientation 6 (stored 1600 × 1200, shows as 1200 × 1600).
  await sharp(svg(1600, 1200, `<rect width="1600" height="1200" fill="#8b5cff"/><text x="800" y="650" font-size="200" text-anchor="middle" font-family="Arial" fill="#fff">ROTATED</text>`))
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toFile(`${out}/rotated.jpg`);
}
