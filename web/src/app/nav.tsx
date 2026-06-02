'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/chart', label: '排盘' },
  { href: '/chat', label: '聊天' },
  { href: '/compare', label: '合盘' },
];

export function NavBar() {
  const path = usePathname();
  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '0 1rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: '1.5rem', color: '#222', textDecoration: 'none' }}>
          AI Destiny OS
        </Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              padding: '1rem 1rem',
              color: path === href ? '#b45309' : '#555',
              borderBottom: path === href ? '2px solid #b45309' : '2px solid transparent',
              textDecoration: 'none',
              fontWeight: path === href ? 600 : 400,
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
