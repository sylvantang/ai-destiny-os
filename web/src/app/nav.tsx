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
    <nav className="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center px-4">
        <Link
          href="/"
          className="mr-6 py-4 text-lg font-bold tracking-tight text-destiny-500 hover:text-destiny-400 transition-colors"
        >
          AI Destiny OS
        </Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-4 py-4 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              path === href
                ? 'border-destiny-500 text-destiny-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
