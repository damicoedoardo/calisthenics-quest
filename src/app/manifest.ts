import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'FORMA',
    short_name: 'FORMA',
    description: 'Calisthenics, played like a game. Train, level up, forge your gear.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Both ways: the tabs have a sideways layout, and the Fog runs sideways.
    orientation: 'any',
    background_color: '#0b0d14',
    theme_color: '#0b0d14',
    categories: ['health', 'fitness', 'games'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
