import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import { QueryProvider } from '@/providers/QueryProvider';
import { NavBar } from '@/components/NavBar';
import { themeBootScript } from '@/lib/theme';
import './globals.css';

const sans = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const cond = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-cond', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Flight Tracker · live flights over India', template: '%s · Flight Tracker' },
  description: 'Every flight in the sky over India, live. Tap a plane to see where it came from, where it is going and when it lands.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Flight Tracker',
  appleWebApp: { capable: true, title: 'Flight Tracker', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: { icon: '/icon.png', apple: '/icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#EEF2F8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${sans.variable} ${cond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans">
        <QueryProvider>
          {children}
          <NavBar />
        </QueryProvider>
      </body>
    </html>
  );
}
