'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, RadioTower, Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: 'Live', icon: RadioTower, match: (p: string) => p === '/' },
  { href: '/airports', label: 'Airports', icon: Plane, match: (p: string) => p.startsWith('/airport') },
  { href: '/fares', label: 'Fares', icon: Ticket, match: (p: string) => p.startsWith('/fares') },
];

export function NavBar() {
  const path = usePathname() ?? '/';
  return (
    <nav
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/95 pb-[env(safe-area-inset-bottom)] backdrop-blur',
        'md:inset-x-auto md:bottom-auto md:left-4 md:top-4 md:rounded-full md:border-0 md:bg-transparent md:pb-0',
      )}
    >
      <ul className="mx-auto flex max-w-md md:glass md:gap-1 md:rounded-full md:p-1 md:shadow-float">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const on = match(path);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-micro font-semibold transition-colors',
                  'md:h-10 md:flex-row md:gap-2 md:rounded-full md:px-4 md:text-small',
                  on ? 'text-ink md:bg-panel-2' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                <Icon className={cn('h-5 w-5 md:h-4 md:w-4', on && 'text-data')} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
