import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return {
    name: 'Houtlijst — PDF naar CSV',
    short_name: 'Houtlijst',
    description: 'Zet houtbestellijsten lokaal om naar controleerbare CSV-bestanden.',
    start_url: `${basePath}/`,
    display: 'standalone',
    background_color: '#f3f3f1',
    theme_color: '#111820',
    lang: 'nl',
    icons: [
      { src: `${basePath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${basePath}/icon-512.png`, sizes: '512x512', type: 'image/png' },
    ],
  };
}
