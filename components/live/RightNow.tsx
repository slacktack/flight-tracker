'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { airlineName } from '@/lib/airlines';
import { fmtInt, ktToKmh } from '@/lib/format';
import type { LiveFlight } from '@/types/flight';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { airlineIata } from '@/lib/airlines';

interface Props {
  flights: LiveFlight[];
  onFlight: (f: LiveFlight) => void;
  onRoute: (from: string, to: string) => void;
  onClose: () => void;
}

// A quick read of the sky in view: extremes and who's flying most.
export function RightNow({ flights, onFlight, onRoute, onClose }: Props) {
  const s = useMemo(() => {
    const air = flights.filter((f) => !f.gnd);
    const highest = air.reduce<LiveFlight | null>((b, f) => (!b || f.alt > b.alt ? f : b), null);
    const fastest = air.reduce<LiveFlight | null>((b, f) => (!b || f.spd > b.spd ? f : b), null);
    const count = <K extends string>(key: (f: LiveFlight) => K | '') => {
      const m = new Map<K, number>();
      for (const f of air) {
        const k = key(f);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    };
    const airlines = count((f) => (airlineName(f.al) ? f.al : '')).slice(0, 5);
    const routes = count((f) => (f.org && f.dst ? `${f.org}-${f.dst}` : '')).slice(0, 5);
    const types = count((f) => f.type).slice(0, 5);
    return { air: air.length, ground: flights.length - air.length, highest, fastest, airlines, routes, types };
  }, [flights]);

  const label = (f: LiveFlight) => f.fn || f.cs || f.reg;

  return (
    <section aria-label="Right now" className="glass max-h-[70dvh] w-full overflow-y-auto overscroll-contain rounded-panel p-4 shadow-float md:max-h-[80dvh] md:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Right now in view</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 font-cond text-code font-bold leading-none">{fmtInt(s.air)}</p>
      <p className="text-small text-ink-2">in the air, {fmtInt(s.ground)} on the ground</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {s.highest && (
          <button type="button" onClick={() => onFlight(s.highest!)} className="rounded-control bg-panel-2 p-3 text-left hover:bg-line">
            <span className="block text-micro text-ink-3">Highest</span>
            <span className="block font-cond text-lead font-semibold">{fmtInt(s.highest.alt)} ft</span>
            <span className="block truncate text-micro text-ink-2">{label(s.highest)}</span>
          </button>
        )}
        {s.fastest && (
          <button type="button" onClick={() => onFlight(s.fastest!)} className="rounded-control bg-panel-2 p-3 text-left hover:bg-line">
            <span className="block text-micro text-ink-3">Fastest</span>
            <span className="block font-cond text-lead font-semibold">{fmtInt(ktToKmh(s.fastest.spd))} km/h</span>
            <span className="block truncate text-micro text-ink-2">{label(s.fastest)}</span>
          </button>
        )}
      </div>

      {s.routes.length > 0 && (
        <>
          <h3 className="mt-4 text-small font-semibold text-ink-2">Busiest routes</h3>
          <ul className="mt-1">
            {s.routes.map(([r, n]) => {
              const [a, b] = r.split('-');
              return (
                <li key={r}>
                  <button type="button" onClick={() => onRoute(a, b)} className="flex min-h-10 w-full items-center justify-between rounded-control px-2 text-small hover:bg-panel-2">
                    <span className="font-cond text-lead font-semibold">{a} to {b}</span>
                    <span className="text-ink-3">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-4 text-small">
        {s.airlines.length > 0 && (
          <div>
            <h3 className="font-semibold text-ink-2">Airlines</h3>
            <ul className="mt-1 space-y-1">
              {s.airlines.map(([a, n]) => (
                <li key={a} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <AirlineLogo iata={airlineIata(a)} size={18} className="rounded" />
                    <span className="truncate">{airlineName(a)}</span>
                  </span>
                  <span className="text-ink-3">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.types.length > 0 && (
          <div>
            <h3 className="font-semibold text-ink-2">Aircraft</h3>
            <ul className="mt-1 space-y-1">
              {s.types.map(([t, n]) => (
                <li key={t} className="flex justify-between gap-2"><span>{t}</span><span className="text-ink-3">{n}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
