'use client';

import { useMemo } from 'react';
import { Plane, X } from 'lucide-react';
import { bands } from '@/lib/altitude';
import { useTheme } from '@/lib/theme';
import { airlineName } from '@/lib/airlines';
import { cn } from '@/lib/cn';
import { fmtInt } from '@/lib/format';
import type { LiveFlight } from '@/types/flight';
import { bandOf, NO_FILTERS, type Filters } from './filters';

interface Props {
  flights: LiveFlight[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
}

export function FilterPanel({ flights, filters, onChange, onClose }: Props) {
  const { theme } = useTheme();
  const ALT_BANDS = bands(theme);
  const bandCounts = useMemo(() => {
    const c = [0, 0, 0, 0, 0];
    for (const f of flights) c[bandOf(f)] += 1;
    return c;
  }, [flights]);
  const airlines = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of flights) if (f.al && airlineName(f.al)) m.set(f.al, (m.get(f.al) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [flights]);

  const toggleBand = (i: number) =>
    onChange({ ...filters, hiddenBands: filters.hiddenBands.includes(i) ? filters.hiddenBands.filter((x) => x !== i) : [...filters.hiddenBands, i] });

  return (
    <section aria-label="Altitude key and filters" className="glass max-h-[60dvh] w-full overflow-y-auto rounded-panel p-4 shadow-float md:max-h-[80dvh] md:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Altitude</h2>
        <button type="button" onClick={onClose} aria-label="Close filters" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <p className="text-small text-ink-3">Tap a band to hide it from the map.</p>
      <ul className="mt-2 space-y-1">
        {ALT_BANDS.map((b, i) => {
          const hidden = filters.hiddenBands.includes(i);
          return (
            <li key={b.label}>
              <button
                type="button"
                aria-pressed={!hidden}
                onClick={() => toggleBand(i)}
                className={cn('flex min-h-10 w-full items-center gap-3 rounded-control px-2 text-left text-small hover:bg-panel-2', hidden && 'opacity-40')}
              >
                <Plane className="h-4 w-4 rotate-45" style={{ color: b.color, fill: b.color }} aria-hidden />
                <span className="flex-1">{b.label}</span>
                <span className="text-ink-3">{fmtInt(bandCounts[i])}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {airlines.length > 0 && (
        <>
          <h2 className="mt-4 text-base font-semibold">Airline</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {airlines.map(([icao, n]) => (
              <button
                key={icao}
                type="button"
                aria-pressed={filters.airline === icao}
                onClick={() => onChange({ ...filters, airline: filters.airline === icao ? null : icao })}
                className={cn('min-h-9 rounded-full border px-3 text-small', filters.airline === icao ? 'border-data bg-data/15 text-ink' : 'border-line text-ink-2 hover:text-ink')}
              >
                {airlineName(icao)} <span className="text-ink-3">{n}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {(filters.hiddenBands.length > 0 || filters.airline || filters.route) && (
        <button type="button" onClick={() => onChange(NO_FILTERS)} className="mt-4 min-h-10 w-full rounded-control border border-line text-small font-semibold text-ink-2 hover:text-ink">
          Show all flights
        </button>
      )}
    </section>
  );
}
