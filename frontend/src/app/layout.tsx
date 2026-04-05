import type { Metadata } from 'next';
import { Inter, DM_Sans, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'So What Menswear | Premium Men\'s Clothing',
  description: 'Premium menswear designed for the modern gentleman. Elevate your style with our curated collections of t-shirts, shirts, and pants.',
  icons: {
    icon: '/sowaatlogo.jpeg',
    shortcut: '/sowaatlogo.jpeg',
    apple: '/sowaatlogo.jpeg',
  }
};

import AuthProvider from '@/components/shared/AuthProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${dmSans.variable} ${playfair.variable} bg-[var(--bg)] min-h-screen text-[var(--text-primary)] antialiased overflow-x-hidden w-full`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
