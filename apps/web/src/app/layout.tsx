import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PWAProvider } from '../components/pwa-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TourSafe - Smart Tourist Safety',
  description: 'AI-powered tourist safety and incident response system',
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'default',
    title: 'TourSafe',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
