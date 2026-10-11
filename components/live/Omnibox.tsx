'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plane, Route, Search, Star, X } from 'lucide-react';
import { useSaved } from '@/lib/saved';
import airports from '@/data/airports.min.json';
import { airlineName } from '@/lib/airlines';
import { altColor } from '@/lib/altitude';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';
import { fmtInt } from '@/lib/format';
import type { LiveFlight } from '@/types/flight';

type Item =
  | { kind: 'flight'; key: string; f: LiveFlight }
  | { kind: 'route'; key: string; from: string; to: string; n: number }
  | { kind: 'airport'; key: string; code: string; name: string; city: string; lat: number; lon: number }
  | { kind: 'saved'; key: string; label: string; sub: string; f: LiveFlight | null };

const AIRPORTS = airports as Array<{ code: string; name: string; city: string; lat: number; lon: number }>;
const LIST_LIMIT = 80;

function search(q: string, flights: LiveFlight[]): Item[] {
  const needle = q.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!needle) {
    return [...flights]
      .filter((f) => !f.gnd)
      .sort((a, b) => (a.fn || a.cs || 'ZZZ').localeCompare(b.fn || b.cs || 'ZZZ'))
      .slice(0, LIST_LIMIT)
      .map((f) => ({ kind: 'flight', key: f.id, f }));
  }
  const items: Item[] = [];
  const route = needle.match(/^([A-Z]{3})[\s\-–>→]+([A-Z]{3})$/);
  if (route) {
    const n = flights.filter((f) => f.org === route[1] && f.dst === route[2]).length;
    items.push({ kind: 'route', key: `r-${route[1]}-${route[2]}`, from: route[1], to: route[2], n });
  }
  const compact = needle.replace(/[\s-]/g, '');
  // Flight numbers and callsigns outrank registrations, which outrank airline names.
  const rank = (f: LiveFlight) =>
    f.fn === compact || f.cs === compact ? 0 : f.fn.startsWith(compact) ? 1 : f.cs.startsWith(compact) ? 2 : f.reg.replace('-', '').startsWith(compact) ? 3 : airlineName(f.al).toUpperCase().startsWith(needle) ? 4 : 9;
  const flightHits = flights
    .map((f) => [rank(f), f] as const)
    .filter(([r]) => r < 9)
    .sort((a, b) => a[0] - b[0] || (a[1].fn || a[1].cs).localeCompare(b[1].fn || b[1].cs))
    .slice(0, 8)
    .map(([, f]) => f);
  for (const f of flightHits) items.push({ kind: 'flight', key: f.id, f });
  const q2 = needle.toLowerCase();
  const apts = AIRPORTS.filter((a) => a.code === needle || a.city.toLowerCase().startsWith(q2) || a.name.toLowerCase().includes(q2))
    .sort((a, b) => (b.code === needle ? 1 : 0) - (a.code === needle ? 1 : 0))
    .slice(0, 5);
  for (const a of apts) items.push({ kind: 'airport', key: `a-${a.code}`, ...a });
  return items;
}

interface Props {
  flights: LiveFlight[];
  onFlight: (f: LiveFlight) => void;
  onRoute: (from: string, to: string) => void;
  onAirport: (a: { code: string; lat: number; lon: number }) => void;
}

export function Omnibox({ flights, onFlight, onRoute, onAirport }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const { saved } = useSaved();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const items = useMemo(() => {
    if (!open) return [];
    const base = search(q, flights);
    if (q.trim()) return base;
    // Saved flights lead the empty list, live when they're in view.
    const mine: Item[] = saved.map((s) => {
      const f = flights.find((x) => (x.fn || x.cs) === s.key) ?? null;
      return { kind: 'saved', key: `s-${s.key}`, label: s.key, sub: f ? `${f.gnd ? 'On the ground' : `${fmtInt(f.alt)} ft`}${f.org && f.dst ? ` · ${f.org} to ${f.dst}` : ''}` : `Not in this area${s.route ? ` · usually ${s.route}` : ''}`, f };
    });
    return [...mine, ...base.filter((it) => !(it.kind === 'flight' && saved.some((s) => s.key === (it.f.fn || it.f.cs))))];
  }, [q, flights, open, saved]);

  useEffect(() => setActive(0), [q]);

  // "/" focuses search, like most map apps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  const choose = (it: Item) => {
    setOpen(false);
    input.current?.blur();
    if (it.kind === 'saved') {
      if (it.f) onFlight(it.f);
      else setQ(it.label);
      return;
    }
    if (it.kind === 'flight') onFlight(it.f);
    else if (it.kind === 'route') onRoute(it.from, it.to);
    else onAirport(it);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && items[active]) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    }
  };

  const listId = 'omnibox-list';
  return (
    <div ref={box} className="relative w-full">
      <div className={cn('glass flex h-12 items-center gap-2 rounded-panel px-3.5 shadow-float transition-shadow focus-within:shadow-[0_0_0_2px_rgb(var(--data)/0.55)]')}>
        <Search className="h-[18px] w-[18px] shrink-0 text-ink-3" aria-hidden />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Flight, airline, route or airport"
          aria-label="Search flights, routes and airports"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={items[active] ? `opt-${items[active].key}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
        />
        {q ? (
          <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:text-ink">
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-line px-1.5 text-micro text-ink-3 md:block">/</kbd>
        )}
      </div>

      {open && (
        <div className="glass absolute inset-x-0 top-[calc(100%+8px)] z-50 origin-top animate-pop overflow-hidden rounded-panel shadow-float">
          <p className="border-b border-line px-4 py-2 text-micro text-ink-3">
            {q.trim() ? (items.length ? 'Results' : 'Nothing matches in this area. Try a flight number like AI101, a route like DEL BOM, or an airport.') : `${fmtInt(flights.filter((f) => !f.gnd).length)} flights in the air here${flights.length > LIST_LIMIT ? `, first ${LIST_LIMIT} shown` : ''}`}
          </p>
          <ul id={listId} role="listbox" className="max-h-[min(60dvh,420px)] overflow-y-auto overscroll-contain py-1">
            {items.map((it, i) => (
              <li
                key={it.key}
                id={`opt-${it.key}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(it)}
                className={cn('flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2', i === active && 'bg-panel-2')}
              >
                {it.kind === 'flight' && (
                  <>
                    <Plane className="h-4 w-4 shrink-0 rotate-45" style={{ color: altColor(it.f.alt, it.f.gnd, theme), fill: altColor(it.f.alt, it.f.gnd, theme) }} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-cond text-lead font-semibold leading-tight">{it.f.fn || it.f.cs || it.f.reg}</span>
                      <span className="block truncate text-small text-ink-2">
                        {[airlineName(it.f.al), it.f.org && it.f.dst ? `${it.f.org} to ${it.f.dst}` : '', it.f.type].filter(Boolean).join(' · ') || 'No route published'}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-small text-ink-3">{it.f.gnd ? 'Ground' : `${fmtInt(it.f.alt)} ft`}</span>
                  </>
                )}
                {it.kind === 'saved' && (
                  <>
                    <Star className="h-4 w-4 shrink-0 fill-warn text-warn" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-cond text-lead font-semibold leading-tight">{it.label}</span>
                      <span className={cn('block truncate text-small', it.f ? 'text-ink-2' : 'text-ink-3')}>{it.sub}</span>
                    </span>
                    {it.f && <span className="shrink-0 rounded-full bg-good/15 px-2 py-0.5 text-micro font-semibold text-good">Live</span>}
                  </>
                )}
                {it.kind === 'route' && (
                  <>
                    <Route className="h-4 w-4 shrink-0 text-route" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-cond text-lead font-semibold">{it.from} to {it.to}</span>
                      <span className="block text-small text-ink-2">{it.n ? `Show the ${it.n} flight${it.n > 1 ? 's' : ''} on this route in view` : 'None in the air here right now'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/fares?from=${it.from}&to=${it.to}`);
                      }}
                      className="shrink-0 rounded-full border border-line px-3 py-1 text-small text-ink-2 hover:text-ink"
                    >
                      Fares
                    </button>
                  </>
                )}
                {it.kind === 'airport' && (
                  <>
                    <Building2 className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block font-cond text-lead font-semibold">{it.code}</span>
                      <span className="block truncate text-small text-ink-2">{it.name}, {it.city}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/airport/${it.code}`);
                      }}
                      className="shrink-0 rounded-full border border-line px-3 py-1 text-small text-ink-2 hover:text-ink"
                    >
                      Board
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
