'use client';

import { CloudRain, Moon, Plane, Tag, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Layers {
  labels: boolean;
  night: boolean;
  airports: boolean;
  radar: boolean;
}

export const DEFAULT_LAYERS: Layers = { labels: false, night: true, airports: true, radar: false };

const ITEMS: Array<{ id: keyof Layers; label: string; hint: string; icon: typeof Tag }> = [
  { id: 'labels', label: 'Flight labels', hint: 'Flight numbers beside planes when zoomed in', icon: Tag },
  { id: 'night', label: 'Day and night', hint: 'Shades where the sun has set', icon: Moon },
  { id: 'radar', label: 'Rain radar', hint: 'Latest precipitation, about 10 minutes old', icon: CloudRain },
  { id: 'airports', label: 'Airports', hint: 'Airport markers and codes', icon: Plane },
];

export function LayersPanel({ layers, onChange, onClose, radarAvailable }: { layers: Layers; onChange: (l: Layers) => void; onClose: () => void; radarAvailable: boolean }) {
  return (
    <section aria-label="Map layers" className="glass max-h-[70dvh] w-full overflow-y-auto overscroll-contain rounded-panel p-4 shadow-float md:max-h-[80dvh] md:w-80">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Map layers</h2>
        <button type="button" onClick={onClose} aria-label="Close layers" className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:text-ink">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="mt-2 space-y-1">
        {ITEMS.filter((i) => i.id !== 'radar' || radarAvailable).map(({ id, label, hint, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              role="switch"
              aria-checked={layers[id]}
              onClick={() => onChange({ ...layers, [id]: !layers[id] })}
              className="flex min-h-12 w-full items-center gap-3 rounded-control px-2 text-left hover:bg-panel-2"
            >
              <Icon className={cn('h-4 w-4 shrink-0', layers[id] ? 'text-data' : 'text-ink-3')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-small font-semibold">{label}</span>
                <span className="block text-micro text-ink-3">{hint}</span>
              </span>
              <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', layers[id] ? 'bg-data' : 'bg-line')} aria-hidden>
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', layers[id] ? 'translate-x-[18px]' : 'translate-x-0.5')} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
