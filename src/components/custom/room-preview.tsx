import { useId } from 'react';
import { cropRect } from '@/lib/custom/crop';
import type { Crop } from '@/lib/custom/types';

/**
 * A room drawn to scale (2 units per centimetre, 3 m of wall) with the poster
 * hung above a 180 cm sofa, so the difference between A4 and A2 is obvious.
 */
const U = 2;
const FLOOR = 360;
const FRAME_CM = 2.5;
const FRAME_FILL: Record<string, string> = { black: '#121216', white: '#f1f1f4' };

export function RoomPreview({ src, img, crop, cm, frame, glossy }: { src: string; img: { w: number; h: number }; crop?: Crop; cm: { w: number; h: number }; frame: string; glossy?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const w = cm.w * U;
  const h = cm.h * U;
  const fb = frame === 'none' ? 0 : FRAME_CM * U;
  const bottom = 140; // 25 cm above the sofa back
  const x = 300 - w / 2;
  const y = bottom - h;
  const r = cropRect(img, w / h, crop);
  const iw = w / r.width;
  const ih = h / r.height;
  return (
    <svg viewBox="0 0 600 420" className="block h-full w-full" role="img" aria-label={`Your poster on a wall above a 180 cm sofa, drawn to scale`}>
      <defs>
        <linearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23233a" />
          <stop offset="1" stopColor="#161624" />
        </linearGradient>
        <radialGradient id={`${id}l`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd58a" stopOpacity="0.32" />
          <stop offset="1" stopColor="#ffd58a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b07a43" />
          <stop offset="0.5" stopColor="#d6a467" />
          <stop offset="1" stopColor="#8d5a2c" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <clipPath id={`${id}c`}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
      </defs>
      <rect width="600" height="420" fill={`url(#${id}w)`} />
      <circle cx="62" cy="128" r="110" fill={`url(#${id}l)`} />
      <rect y={FLOOR} width="600" height={420 - FLOOR} fill="#0e0e16" />
      <rect y={FLOOR - 8} width="600" height="8" fill="#26263c" />

      {/* floor lamp */}
      <g fill="#2f2f45">
        <rect x="60" y="140" width="4" height={FLOOR - 140} />
        <ellipse cx="62" cy={FLOOR - 2} rx="22" ry="5" />
        <path d="M40 140 L84 140 L74 104 L50 104 Z" fill="#3c3c58" />
      </g>

      {/* sofa, 180 cm wide */}
      <g>
        <rect x="128" y="190" width="344" height="92" rx="18" fill="#3b2a6b" />
        <rect x="120" y="262" width="360" height="58" rx="14" fill="#4a3685" />
        <rect x="108" y="236" width="48" height="96" rx="16" fill="#3b2a6b" />
        <rect x="444" y="236" width="48" height="96" rx="16" fill="#3b2a6b" />
        <rect x="140" y="236" width="156" height="40" rx="12" fill="#56409a" />
        <rect x="304" y="236" width="156" height="40" rx="12" fill="#56409a" />
        <rect x="122" y="332" width="8" height={FLOOR - 340} fill="#0b0b12" />
        <rect x="470" y="332" width="8" height={FLOOR - 340} fill="#0b0b12" />
      </g>

      {/* the poster */}
      <g filter={`url(#${id}s)`}>
        {fb > 0 && (
          <rect x={x - fb} y={y - fb} width={w + fb * 2} height={h + fb * 2} fill={frame === 'wood' ? `url(#${id}f)` : (FRAME_FILL[frame] ?? '#121216')} />
        )}
        <rect x={x} y={y} width={w} height={h} fill="#fff" />
      </g>
      <image href={src} x={x - r.left * iw} y={y - r.top * ih} width={iw} height={ih} preserveAspectRatio="none" clipPath={`url(#${id}c)`} />
      {glossy && <rect x={x} y={y} width={w} height={h} fill={`url(#${id}g)`} />}
      {fb > 0 && frame === 'white' && <rect x={x - fb} y={y - fb} width={w + fb * 2} height={h + fb * 2} fill="none" stroke="#c9c9d4" strokeWidth="0.6" />}
    </svg>
  );
}
