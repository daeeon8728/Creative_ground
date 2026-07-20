import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ThemeInit } from '@/components/ThemeInit';

export const metadata: Metadata = {
  title: 'Forge3D — Browser 3D Modeling',
  description: 'Create, explore, and share 3D scenes directly in your browser. Powered by AI.',
  openGraph: {
    title: 'Forge3D',
    description: 'Browser-based 3D modeling with AI assistance.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeInit />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
