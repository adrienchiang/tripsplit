import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TripSplit 旅費分賬',
  description: '專為朋友旅行設計的分賬工具',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#060f2a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-HK" className="dark">
      <body className="bg-charcoal-950 text-charcoal-100">{children}</body>
    </html>
  );
}
