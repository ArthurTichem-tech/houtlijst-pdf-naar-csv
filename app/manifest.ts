import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Houtlijst — PDF naar CSV',
    short_name: 'Houtlijst',
    description: 'Zet houtbestellijsten lokaal om naar controleerbare CSV-bestanden.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f5',
    theme_color: '#194d36',
    lang: 'nl',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
