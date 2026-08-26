import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegister from './sw-register';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Houtlijst — PDF naar CSV',
  description: 'Zet houtbestellijsten om naar controleerbare CSV-bestanden.',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: [{ url: '/og.png', width: 1792, height: 1024, alt: 'Houtlijst zet een bestellijst om naar een controleerbare CSV' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Houtlijst — PDF naar CSV',
    description: 'Van bestellijst naar een controleerbare CSV.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
