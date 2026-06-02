import type { Metadata } from 'next';
import { NavBar } from './nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Destiny OS',
  description: 'Professional BaZi Analysis Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased">
        <NavBar />
        <main className="mx-auto max-w-4xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
