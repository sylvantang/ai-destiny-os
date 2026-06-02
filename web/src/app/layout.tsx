import type { Metadata } from 'next';
import { NavBar } from './nav';

export const metadata: Metadata = {
  title: 'AI Destiny OS',
  description: 'Professional BaZi Analysis Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, "PingFang SC", "Noto Sans SC", sans-serif', background: '#fafafa', color: '#222' }}>
        <NavBar />
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
