'use client';

import { useState } from 'react';
import { airlineIata } from '@/lib/airlines';
import { cn } from '@/lib/cn';

// IATA from the flight number ("6E1014" -> "6E"), else the ICAO table.
export function iataOf(fn: string, icao: string): string {
  const m = fn.match(/^([A-Z0-9]{2})\d/);
  return m ? m[1] : airlineIata(icao);
}

const SOURCES = (iata: string) => [`https://pics.avs.io/120/120/${iata}.png`, `https://images.kiwi.com/airlines/64/${iata}.png`];

export function AirlineLogo({ iata, size = 28, className }: { iata: string; size?: number; className?: string }) {
  const [i, setI] = useState(0);
  const srcs = iata ? SOURCES(iata) : [];
  const box = cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white ring-1 ring-black/5', className);
  if (!iata || i >= srcs.length) {
    return (
      <span className={cn(box, 'bg-panel-2 font-cond text-micro font-bold text-ink-2')} style={{ width: size, height: size }} aria-hidden>
        {iata || '✈'}
      </span>
    );
  }
  return (
    <span className={box} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcs[i]} alt="" width={size} height={size} loading="lazy" className="h-full w-full object-contain p-0.5" onError={() => setI((n) => n + 1)} />
    </span>
  );
}
