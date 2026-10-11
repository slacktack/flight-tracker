'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

const LABEL = { system: 'Theme: match device', light: 'Theme: light', dark: 'Theme: dark' } as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { pref, cycle } = useTheme();
  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Monitor;
  return (
    <button type="button" onClick={cycle} aria-label={`${LABEL[pref]}. Change theme`} title={LABEL[pref]} className={cn('flex h-11 w-11 items-center justify-center text-ink-2 hover:text-ink', className)}>
      <Icon className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
