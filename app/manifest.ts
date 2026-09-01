import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return {
    id: `${basePath}/`,
    name: 'Houtlijst — PDF naar CSV',
    short_name: 'Houtlijst',
    description: 'Zet houtbestellijsten lokaal om naar controleerbare CSV-bestanden.',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    orientation: 'any',
    background_color: '#f3f3f1',
    theme_color: '#111820',
    lang: 'nl',
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,
    icons: [
      { src: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${basePath}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
