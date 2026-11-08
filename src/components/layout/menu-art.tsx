'use client';

import { useEffect, useState } from 'react';
import type { ArtSpec } from '@/lib/art/types';

const WIDE = '(min-width: 1280px)';

/**
 * Artwork for the desktop menus. The menus only open on wide screens, so the
 * picture is drawn in the browser once the page is idle, instead of being sent
 * with every page (it would be repeated in the HTML and React's page data).
 */
export function MenuArt({ spec, idPrefix }: { spec: ArtSpec; idPrefix: string }) {
  const [svg, setSvg] = useState('');
  const key = JSON.stringify(spec);

  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    let cancelled = false;
    let idle = 0;
    const draw = () => {
      if (!wide.matches || idle) return;
      const run = () => {
        void import('@/lib/art/render').then(({ renderArt }) => {
          if (!cancelled) setSvg(renderArt(JSON.parse(key) as ArtSpec, { idPrefix }));
        });
      };
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, { timeout: 4000 }) : window.setTimeout(run, 1500);
    };
    draw();
    wide.addEventListener('change', draw);
    return () => {
      cancelled = true;
      wide.removeEventListener('change', draw);
      if (idle) (typeof window.cancelIdleCallback === 'function' ? window.cancelIdleCallback : window.clearTimeout)(idle);
    };
  }, [key, idPrefix]);

  return <div className="art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
