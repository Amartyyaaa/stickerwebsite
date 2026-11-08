import type { Metadata, Viewport } from 'next';
import { Anton, Barlow, Caveat } from 'next/font/google';
import './globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });
const barlow = Barlow({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-barlow', display: 'swap' });
const caveat = Caveat({ weight: '700', subsets: ['latin'], variable: '--font-caveat', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'PrintYourVibe: stickers, posters and polaroids', template: '%s | PrintYourVibe' },
  description: 'Laptop stickers, 3D stickers, wall posters, framed posters and polaroids for every fandom and mood. Printed in India, with UPI and Cash on Delivery.',
  applicationName: 'PrintYourVibe',
  openGraph: { siteName: 'PrintYourVibe', type: 'website', locale: 'en_IN' },
};

export const viewport: Viewport = {
  themeColor: '#0b0b12',
  colorScheme: 'dark',
  viewportFit: 'cover',
};

/** Fonts and the page frame. The shop and the admin panel each add their own header and layout. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-IN" className={`${anton.variable} ${barlow.variable} ${caveat.variable}`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:bg-lime focus:px-4 focus:py-2 focus:font-bold focus:text-bg">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
