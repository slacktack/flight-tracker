'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, ArrowUpRight, ChevronDown, Minus, Plus, Search } from 'lucide-react';
import airports from '@/data/airports.min.json';
import { PlacePicker } from '@/components/ui/PlacePicker';
import { AirlineLogo } from '@/components/ui/AirlineLogo';
import { cn } from '@/lib/cn';
import { dayDiff, fmtDayShort, fmtInr, fmtMinutes, hhmm, todayIso } from '@/lib/format';
import type { CompareResponse, FareDay, Itinerary, Leg, Place } from '@/types/booking';

const CABINS = [
  { id: 'economy', label: 'Economy' },
  { id: 'premium', label: 'Premium economy' },
  { id: 'business', label: 'Business' },
  { id: 'first', label: 'First' },
] as const;
type Cabin = (typeof CABINS)[number]['id'];
type Sort = 'cheapest' | 'fastest' | 'best';
const WINDOWS = [
  { id: 'morning', label: 'Morning', from: 5, to: 12 },
  { id: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
  { id: 'evening', label: 'Evening', from: 17, to: 21 },
  { id: 'night', label: 'Night', from: 21, to: 29 },
] as const;

const LOCAL = new Map((airports as Array<{ code: string; name: string; city: string; country: string }>).map((a) => [a.code, a]));
const placeOf = (code: string | null): Place | null => {
  if (!code) return null;
  const a = LOCAL.get(code);
  return { iata: code, name: a?.name ?? code, city: a?.city ?? code, country: a?.country ?? '', type: 'airport' };
};

function LegRow({ leg }: { leg: Leg }) {
  const next = dayDiff(leg.dep, leg.arr);
  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {leg.carrier.logo ? <img src={leg.carrier.logo} alt="" className="h-8 w-8 shrink-0 rounded-md bg-white object-contain p-0.5" /> : <span className="h-8 w-8 shrink-0 rounded-md bg-panel-2" />}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-cond text-title font-semibold leading-none">{hhmm(leg.dep)}</span>
          <span className="relative mx-1 h-px min-w-6 flex-1 bg-line">
            {leg.stops > 0 &&
              Array.from({ length: leg.stops }, (_, i) => (
                <span key={i} className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full border-2 border-warn bg-panel" style={{ left: `${((i + 1) / (leg.stops + 1)) * 100}%` }} />
              ))}
          </span>
          <span className="font-cond text-title font-semibold leading-none">
            {hhmm(leg.arr)}
            {next > 0 && <sup className="ml-0.5 text-micro text-warn">+{next}</sup>}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2 text-small text-ink-3">
          <span>{leg.from.iata}</span>
          <span className={cn('truncate', leg.stops === 0 ? 'text-good' : 'text-ink-2')}>
            {fmtMinutes(leg.minutes)} · {leg.stops === 0 ? 'nonstop' : `${leg.stops} stop${leg.stops > 1 ? 's' : ''}${leg.stopCodes.length ? ` in ${leg.stopCodes.join(', ')}` : ''}`}
          </span>
          <span>{leg.to.iata}</span>
        </div>
      </div>
    </div>
  );
}

function ItineraryCard({ it, cheapest }: { it: Itinerary; cheapest: boolean }) {
  const [open, setOpen] = useState(false);
  const best = it.offers[0];
  const carriers = Array.from(new Set(it.legs.map((l) => l.carrier.name))).join(' + ');
  const numbers = it.legs.flatMap((l) => l.segments.map((s) => s.flightNumber)).join(', ');
  return (
    <li className="rounded-panel bg-panel p-4 hairline">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{carriers}</p>
          <p className="truncate text-small text-ink-3">{numbers}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-cond text-title font-bold leading-none">{fmtInr(it.price)}</p>
          {cheapest && <p className="mt-1 text-micro font-semibold text-good">Cheapest</p>}
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {it.legs.map((l, i) => (
          <LegRow key={i} leg={l} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {best && (
          <a href={best.deepLink} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control bg-route px-4 text-small font-semibold text-white hover:brightness-110 sm:flex-none">
            <span className="whitespace-nowrap">Book on {best.agent.name}</span>
            <span className="hidden whitespace-nowrap sm:inline">for {fmtInr(best.price)}</span> <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        )}
        {it.offers.length > 1 && (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-small font-semibold text-ink-2 hover:text-ink">
            {it.offers.length - 1} more site{it.offers.length > 2 ? 's' : ''}
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-2 divide-y divide-line rounded-control bg-panel-2/60">
          {it.offers.slice(1).map((o) => (
            <li key={o.agent.id}>
              <a href={o.deepLink} target="_blank" rel="noopener noreferrer sponsored" className="flex min-h-11 items-center gap-3 px-3 py-2 hover:bg-panel-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {o.agent.logo && <img src={o.agent.logo} alt="" className="h-5 w-12 object-contain" />}
                <span className="flex-1 text-small">{o.agent.name}</span>
                <span className="font-cond text-lead font-semibold">{fmtInr(o.price)}</span>
                <ArrowUpRight className="h-4 w-4 text-ink-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// How the chosen day compares with the days around it.
function PriceInsight({ days, date, onPick }: { days: FareDay[]; date: string; onPick: (d: string) => void }) {
  const today = days.find((d) => d.date === date);
  if (!today || days.length < 5) return null;
  const sorted = [...days].map((d) => d.price).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const cheapest = days.reduce((b, d) => (d.price < b.price ? d : b));
  const diff = Math.round(((today.price - median) / median) * 100);
  const tone = diff <= -5 ? 'good' : diff >= 8 ? 'warn' : 'ink';
  const verdict = diff <= -5 ? 'Low' : diff >= 8 ? 'High' : 'Typical';
  const saving = today.price - cheapest.price;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel bg-panel p-4 hairline">
      <span className={cn('rounded-full px-3 py-1 text-small font-semibold', tone === 'good' ? 'bg-good/15 text-good' : tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-panel-2 text-ink-2')}>{verdict} price</span>
      <p className="min-w-0 flex-1 text-small text-ink-2">
        {fmtInr(today.price)} on {fmtDayShort(date)} is {diff === 0 ? 'about the usual' : `${Math.abs(diff)}% ${diff < 0 ? 'below' : 'above'} the typical`} {fmtInr(median)} for these two weeks.
        {saving > 200 && cheapest.date !== date && (
          <>
            {' '}
            <button type="button" onClick={() => onPick(cheapest.date)} className="font-semibold text-ink underline decoration-route decoration-2 underline-offset-4">
              Fly {fmtDayShort(cheapest.date)} and save {fmtInr(saving)}
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function FareStrip({ days, value, onPick }: { days: FareDay[]; value: string; onPick: (d: string) => void }) {
  const min = Math.min(...days.map((d) => d.price));
  const max = Math.max(...days.map((d) => d.price));
  return (
    <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="group" aria-label="Cheapest fare by day">
      {days.map((d) => {
        const on = d.date === value;
        const h = max === min ? 1 : 0.25 + 0.75 * ((d.price - min) / (max - min));
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onPick(d.date)}
            aria-pressed={on}
            className={cn('flex w-[4.5rem] shrink-0 flex-col items-center rounded-control px-1 pb-2 pt-2 transition-colors', on ? 'bg-panel-2 hairline' : 'hover:bg-panel')}
          >
            <span className="flex h-10 w-full items-end justify-center" aria-hidden>
              <span className={cn('w-5 rounded-t', d.price === min ? 'bg-good' : on ? 'bg-route' : 'bg-line')} style={{ height: `${h * 100}%` }} />
            </span>
            <span className="mt-1.5 text-micro text-ink-3">{fmtDayShort(d.date).replace(',', '')}</span>
            <span className={cn('font-cond text-base font-semibold', d.price === min && 'text-good')}>{fmtInr(d.price)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FaresScreen() {
  const router = useRouter();
  const sp = useSearchParams();
  const qFrom = sp.get('from');
  const qTo = sp.get('to');
  const qDate = sp.get('date') ?? todayIso(7);
  const qRet = sp.get('return');
  const qCabin = (sp.get('cabin') as Cabin) ?? 'economy';
  const qAdults = Number(sp.get('adults') ?? 1);
  const ready = !!(qFrom && qTo && qFrom !== qTo);

  const [from, setFrom] = useState<Place | null>(placeOf(qFrom));
  const [to, setTo] = useState<Place | null>(placeOf(qTo));
  const [date, setDate] = useState(qDate);
  const [ret, setRet] = useState<string | null>(qRet);
  const [cabin, setCabin] = useState<Cabin>(qCabin);
  const [adults, setAdults] = useState(qAdults);
  const [sort, setSort] = useState<Sort>('cheapest');
  const [nonstop, setNonstop] = useState(false);
  const [airline, setAirline] = useState<string | null>(null);
  const [windows, setWindows] = useState<string[]>([]);
  const [maxMin, setMaxMin] = useState<number | null>(null);

  useEffect(() => {
    setFrom(placeOf(qFrom));
    setTo(placeOf(qTo));
    setDate(qDate);
    setRet(qRet);
  }, [qFrom, qTo, qDate, qRet]);

  const go = (over: Partial<{ date: string; ret: string | null }> = {}) => {
    if (!from || !to || from.iata === to.iata) return;
    const p = new URLSearchParams({ from: from.iata, to: to.iata, date: over.date ?? date, cabin, adults: String(adults) });
    const r = 'ret' in over ? over.ret : ret;
    if (r) p.set('return', r);
    router.push(`/fares?${p}`);
  };

  const search = useQuery({
    queryKey: ['fares', qFrom, qTo, qDate, qRet, qCabin, qAdults, sort],
    queryFn: async ({ signal }) => {
      const p = new URLSearchParams({ from: qFrom!, to: qTo!, date: qDate, cabin: qCabin, adults: String(qAdults), sort });
      if (qRet) p.set('return', qRet);
      const res = await fetch(`/api/fares/search?${p}`, { signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Fare search failed');
      return body as CompareResponse;
    },
    enabled: ready,
    staleTime: 120_000,
  });

  const calendar = useQuery({
    queryKey: ['fare-cal', qFrom, qTo, qDate],
    queryFn: async ({ signal }) => (await (await fetch(`/api/fares/calendar?from=${qFrom}&to=${qTo}&date=${qDate}`, { signal })).json()) as { days?: FareDay[] },
    enabled: ready,
    staleTime: 600_000,
  });
  const strip = useMemo(() => {
    const days = calendar.data?.days ?? [];
    const i = days.findIndex((d) => d.date >= qDate);
    return days.slice(Math.max(0, i - 3), Math.max(0, i - 3) + 14);
  }, [calendar.data, qDate]);

  const all = useMemo(() => search.data?.itineraries ?? [], [search.data]);
  const airlines = useMemo(() => Array.from(new Set(all.flatMap((it) => it.legs.map((l) => l.carrier.name)))).filter(Boolean).sort(), [all]);
  const totalMin = (it: Itinerary) => it.legs.reduce((m, l) => m + l.minutes, 0);
  const longest = useMemo(() => Math.max(60, ...all.map(totalMin)), [all]);
  const shortest = useMemo(() => (all.length ? Math.min(...all.map(totalMin)) : 0), [all]);
  const limit = maxMin ?? longest;

  // Each filter in isolation, so chips can show their own cheapest fare.
  const passes = (it: Itinerary, skip?: 'stops' | 'airline' | 'time' | 'duration') => {
    const out = it.legs[0];
    if (!out) return false;
    if (skip !== 'stops' && nonstop && it.legs.some((l) => l.stops > 0)) return false;
    if (skip !== 'airline' && airline && !it.legs.some((l) => l.carrier.name === airline)) return false;
    if (skip !== 'time' && windows.length) {
      const h = Number(out.dep.slice(11, 13));
      const hh = h < 5 ? h + 24 : h;
      if (!WINDOWS.some((w) => windows.includes(w.id) && hh >= w.from && hh < w.to)) return false;
    }
    if (skip !== 'duration' && totalMin(it) > limit) return false;
    return true;
  };
  const shown = useMemo(() => all.filter((it) => passes(it)), [all, nonstop, airline, windows, limit]); // eslint-disable-line react-hooks/exhaustive-deps
  const minOf = (list: Itinerary[]) => (list.length ? Math.min(...list.map((i) => i.price)) : null);
  const chipPrice = {
    nonstop: minOf(all.filter((it) => passes(it, 'stops') && it.legs.every((l) => l.stops === 0))),
    window: (w: (typeof WINDOWS)[number]) =>
      minOf(
        all.filter((it) => {
          if (!passes(it, 'time')) return false;
          const h = Number(it.legs[0].dep.slice(11, 13));
          const hh = h < 5 ? h + 24 : h;
          return hh >= w.from && hh < w.to;
        }),
      ),
    airline: (name: string) => minOf(all.filter((it) => passes(it, 'airline') && it.legs.some((l) => l.carrier.name === name))),
  };
  const airlineIataByName = useMemo(() => new Map(all.flatMap((it) => it.legs.map((l) => [l.carrier.name, l.carrier.iata] as const))), [all]);
  const filtering = nonstop || !!airline || windows.length > 0 || maxMin !== null;
  const cheapest = shown.length ? Math.min(...shown.map((i) => i.price)) : 0;

  return (
    <>
      <header className="pt-10 md:pt-6">
        <h1 className="font-cond text-hero font-bold leading-none tracking-tight">Fares</h1>
        <p className="mt-2 max-w-md text-base text-ink-2">Compare prices across booking sites, then book on the one you pick.</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="glass mt-6 rounded-panel shadow-float"
      >
        <div className="relative grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <PlacePicker label="From" value={from} onChange={setFrom} className="px-4 py-3" />
          <PlacePicker label="To" value={to} onChange={setTo} className="px-4 py-3 sm:pl-8" />
          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
            }}
            aria-label="Swap from and to"
            className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-panel-2 text-ink-2 hairline hover:text-ink sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-4">
          <label className="block px-4 py-3">
            <span className="block text-micro font-medium text-ink-3">Depart</span>
            <input type="date" value={date} min={todayIso(0)} onChange={(e) => setDate(e.target.value)} className="mt-0.5 h-8 w-full bg-transparent font-cond text-lead font-semibold text-ink outline-none [color-scheme:inherit]" />
          </label>
          <label className="block px-4 py-3">
            <span className="block text-micro font-medium text-ink-3">Return</span>
            {ret === null ? (
              <button type="button" onClick={() => setRet(date)} className="mt-0.5 h-8 text-left text-base text-ink-3 hover:text-ink">
                Add return
              </button>
            ) : (
              <span className="flex items-center gap-1">
                <input type="date" value={ret} min={date} onChange={(e) => setRet(e.target.value)} className="mt-0.5 h-8 w-full bg-transparent font-cond text-lead font-semibold text-ink outline-none" />
                <button type="button" onClick={() => setRet(null)} aria-label="Remove return" className="text-ink-3 hover:text-ink">
                  ×
                </button>
              </span>
            )}
          </label>
          <div className="border-t border-line px-4 py-3 sm:border-t-0">
            <span className="block text-micro font-medium text-ink-3">Travellers</span>
            <div className="mt-0.5 flex h-8 items-center gap-3">
              <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1} aria-label="Fewer travellers" className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 disabled:opacity-40">
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <span className="w-4 text-center font-cond text-lead font-semibold" aria-live="polite">{adults}</span>
              <button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))} disabled={adults >= 9} aria-label="More travellers" className="flex h-8 w-8 items-center justify-center rounded-full bg-panel-2 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </div>
          <label className="block border-t border-line px-4 py-3 sm:border-t-0">
            <span className="block text-micro font-medium text-ink-3">Cabin</span>
            <select value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)} className="mt-0.5 h-8 w-full bg-transparent font-cond text-lead font-semibold text-ink outline-none">
              {CABINS.map((c) => (
                <option key={c.id} value={c.id} className="bg-panel text-ink">
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="border-t border-line p-3">
          <button type="submit" disabled={!from || !to || from.iata === to.iata} className="flex h-12 w-full items-center justify-center gap-2 rounded-control bg-route text-base font-semibold text-white hover:brightness-110 disabled:opacity-40">
            <Search className="h-4 w-4" aria-hidden /> Search fares
          </button>
        </div>
      </form>

      {!ready && (
        <section className="mt-10">
          <h2 className="text-lead font-semibold">Popular from India</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['DEL', 'BOM'],
              ['BOM', 'BLR'],
              ['DEL', 'BLR'],
              ['BLR', 'HYD'],
              ['DEL', 'DXB'],
              ['BOM', 'SIN'],
            ].map(([a, b]) => (
              <li key={a + b}>
                <button type="button" onClick={() => router.push(`/fares?from=${a}&to=${b}&date=${todayIso(7)}`)} className="flex w-full items-center justify-between rounded-panel bg-panel px-4 py-3 text-left hairline hover:bg-panel-2">
                  <span className="font-cond text-title font-semibold">
                    {a} <span className="text-ink-3">→</span> {b}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ready && (
        <section className="mt-8" aria-live="polite">
          {strip.length > 0 && <PriceInsight days={strip} date={qDate} onPick={(d) => go({ date: d })} />}
          {strip.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-small font-medium text-ink-2">Cheapest by day</h2>
              <FareStrip days={strip} value={qDate} onPick={(d) => go({ date: d })} />
            </div>
          )}

          <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
            <div role="radiogroup" aria-label="Sort" className="flex shrink-0 rounded-full bg-panel p-1 hairline">
              {(['cheapest', 'fastest', 'best'] as const).map((s) => (
                <button key={s} role="radio" aria-checked={sort === s} onClick={() => setSort(s)} className={cn('min-h-9 rounded-full px-3.5 text-small font-semibold capitalize', sort === s ? 'bg-panel-2 text-ink' : 'text-ink-3')}>
                  {s}
                </button>
              ))}
            </div>
            <button type="button" aria-pressed={nonstop} onClick={() => setNonstop((v) => !v)} disabled={!nonstop && chipPrice.nonstop === null} className={cn('inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-small font-semibold transition-colors', nonstop ? 'border-good bg-good/15 text-good' : 'border-line text-ink-2 disabled:opacity-40')}>
              Nonstop {chipPrice.nonstop !== null && <span className="font-normal text-ink-3">{fmtInr(chipPrice.nonstop)}</span>}
            </button>
            {WINDOWS.map((w) => {
              const price = chipPrice.window(w);
              const on = windows.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={on}
                  disabled={!on && price === null}
                  onClick={() => setWindows((cur) => (cur.includes(w.id) ? cur.filter((x) => x !== w.id) : [...cur, w.id]))}
                  className={cn('inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-small font-semibold transition-colors', on ? 'border-data bg-data/15 text-ink' : 'border-line text-ink-2 disabled:opacity-40')}
                >
                  {w.label} {price !== null && <span className="font-normal text-ink-3">{fmtInr(price)}</span>}
                </button>
              );
            })}
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setNonstop(false);
                  setAirline(null);
                  setWindows([]);
                  setMaxMin(null);
                }}
                className="min-h-10 shrink-0 px-2 text-small font-semibold text-route"
              >
                Clear filters
              </button>
            )}
          </div>

          {airlines.length > 1 && (
            <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Airline">
              {airlines.map((a) => {
                const on = airline === a;
                const price = chipPrice.airline(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAirline(on ? null : a)}
                    className={cn('inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-small font-semibold transition-colors', on ? 'border-route bg-route/10 text-ink' : 'border-line text-ink-2')}
                  >
                    <AirlineLogo iata={airlineIataByName.get(a) ?? ''} size={26} className="rounded-full" />
                    {a} {price !== null && <span className="font-normal text-ink-3">{fmtInr(price)}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {all.length > 1 && longest > shortest && (
            <label className="mt-3 flex items-center gap-3 text-small text-ink-2">
              <span className="shrink-0">Max trip</span>
              <input
                type="range"
                min={shortest}
                max={longest}
                step={15}
                value={limit}
                onChange={(e) => setMaxMin(Number(e.target.value) >= longest ? null : Number(e.target.value))}
                className="h-2 flex-1 accent-[rgb(var(--route))]"
              />
              <span className="w-16 shrink-0 text-right font-semibold text-ink">{fmtMinutes(limit)}</span>
            </label>
          )}

          {search.isLoading && (
            <div className="mt-4">
              <p className="text-base text-ink-2">Checking booking sites for {qFrom} to {qTo} on {fmtDayShort(qDate)}…</p>
              <ul className="mt-3 space-y-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <li key={i} className="h-40 animate-pulse rounded-panel bg-panel" />
                ))}
              </ul>
            </div>
          )}
          {search.isError && <p className="mt-4 rounded-panel bg-bad/10 p-4 text-base text-bad">{(search.error as Error).message}. Try again in a moment.</p>}
          {search.data && (
            <>
              <p className="mt-4 text-small text-ink-3">
                {shown.length} of {all.length} options{!search.data.complete && ', more still arriving'}. Prices from partner sites; you book and pay on their site.
              </p>
              {shown.length === 0 && <p className="mt-6 text-base text-ink-2">Nothing matches these filters. Turn one off to see more.</p>}
              <ul className="mt-3 space-y-2">
                {shown.map((it, i) => (
                  <ItineraryCard key={it.id} it={it} cheapest={it.price === cheapest && shown.findIndex((x) => x.price === cheapest) === i} />
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
