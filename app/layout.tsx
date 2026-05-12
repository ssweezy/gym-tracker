import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gym Tracker',
  description: 'Персональный фитнес-дневник',
  manifest: '/manifest.webmanifest',
  applicationName: 'Gym Tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gym',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.svg', type: 'image/svg+xml', sizes: '192x192' },
      { url: '/icons/icon-512.svg', type: 'image/svg+xml', sizes: '512x512' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.svg', sizes: '180x180' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-bg text-text-primary antialiased">
        {children}
        <Toaster theme="dark" position="bottom-center" richColors />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
