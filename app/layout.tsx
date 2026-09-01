import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from './sw-register';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://houtlijst-pdf-naar-csv.arthurtichem.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Houtlijst — PDF naar CSV',
  description: 'Zet houtbestellijsten om naar controleerbare CSV-bestanden.',
  manifest: `${basePath}/manifest.webmanifest`,
  applicationName: 'Houtlijst PDF naar CSV',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Houtlijst',
  },
  openGraph: {
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: [{ url: `${basePath}/og.png`, width: 1734, height: 907, alt: 'Houtlijst converter van PDF naar CSV' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: [`${basePath}/og.png`],
  },
};

export const viewport: Viewport = {
  themeColor: '#111820',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
