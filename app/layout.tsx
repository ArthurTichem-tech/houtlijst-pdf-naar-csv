import type { Metadata } from 'next';
import './globals.css';
import ServiceWorkerRegister from './sw-register';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://houtlijst-pdf-naar-csv.arthurtichem.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Houtlijst — PDF naar CSV',
  description: 'Zet houtbestellijsten om naar controleerbare CSV-bestanden.',
  manifest: `${basePath}/manifest.webmanifest`,
  openGraph: {
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: [{ url: `${basePath}/og.png`, width: 1792, height: 1024, alt: 'Houtlijst zet een bestellijst om naar een controleerbare CSV' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: [`${basePath}/og.png`],
  },
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
