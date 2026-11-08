import type { MetadataRoute } from 'next';

/** Lets shoppers add the store to their phone's home screen, with the right name, colours and icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PrintYourVibe',
    short_name: 'PrintYourVibe',
    description: 'Stickers, posters and polaroids for every fandom and mood. Printed in India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b12',
    theme_color: '#0b0b12',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
