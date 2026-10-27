import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { ServiceWorker } from '@/components/ServiceWorker';
import { SPLASH } from './splash-sizes.json';
import './globals.css';

// Icons come from the app/ file conventions (icon.svg, apple-icon.png) and the
// install metadata from app/manifest.ts.
export const metadata: Metadata = {
  title: 'FORMA',
  description: 'Calisthenics, played like a game. Train, level up, forge your gear.',
  applicationName: 'FORMA',
  appleWebApp: {
    capable: true,
    title: 'FORMA',
    statusBarStyle: 'black-translucent',
    // iOS launch screens (drawn by scripts/splash.cjs): one per iPhone screen size, portrait.
    startupImage: SPLASH.map(({ w, h, dpr }) => ({
      url: `/splash/${w * dpr}x${h * dpr}.png`,
      media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })),
  },
  formatDetection: { telephone: false },
};

// Device width with no zoom, edge to edge under the notch when installed.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0d14',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
