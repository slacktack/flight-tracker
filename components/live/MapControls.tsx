'use client';

import { Layers, LocateFixed, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Props {
  onZoom: (d: number) => void;
  onLocate: () => void;
  layersOpen: boolean;
  onLayers: () => void;
  filterCount: number;
  filtersOpen: boolean;
  onFilters: () => void;
}

const btn = 'flex h-11 w-11 items-center justify-center text-ink-2 transition-colors hover:text-ink';

export function MapControls(p: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="glass flex flex-col overflow-hidden rounded-control shadow-float">
        <button type="button" onClick={p.onFilters} aria-expanded={p.filtersOpen} aria-label="Altitude key and filters" className={cn(btn, 'relative', p.filtersOpen && 'text-data')}>
          <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
          {p.filterCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-route px-1 text-[10px] font-bold text-night">{p.filterCount}</span>}
        </button>
        <span className="mx-2 h-px bg-line" />
        <button type="button" onClick={p.onLayers} aria-expanded={p.layersOpen} aria-label="Map layers" className={cn(btn, p.layersOpen && 'text-data')}>
          <Layers className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <span className="mx-2 h-px bg-line" />
        <ThemeToggle />
        <span className="mx-2 h-px bg-line" />
        <button type="button" onClick={p.onLocate} aria-label="Show flights near me" className={btn}>
          <LocateFixed className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
      <div className="glass hidden flex-col overflow-hidden rounded-control shadow-float md:flex">
        <button type="button" onClick={() => p.onZoom(1)} aria-label="Zoom in" className={btn}>
          <Plus className="h-[18px] w-[18px]" aria-hidden />
        </button>
        <span className="mx-2 h-px bg-line" />
        <button type="button" onClick={() => p.onZoom(-1)} aria-label="Zoom out" className={btn}>
          <Minus className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
