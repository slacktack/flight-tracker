'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Map as MapIcon, PlaneLanding, PlaneTakeoff, SquareParking, Ticket } from 'lucide-react';
import airports from '@/data/airports.min.json';
import { airlineName } from '@/lib/airlines';
import { altColor } from '@/lib/altitude';
import { cn } from '@/lib/cn';
import { fmtAgo, fmtInt, fmtMinutes } from '@/lib/format';
import { useTheme } from '@/lib/theme';
import type { Board, BoardRow } from '@/lib/boards';
import { MiniMap } from '@/components/ui/MiniMap';
import { AirportWeather } from './AirportWeather';
import { AirlineLogo, iataOf } from '@/components/ui/AirlineLogo';

type Tab = 'arriving' | 'departed' | 'ground';
const TABS: Array<{ id: Tab; label: string; icon: typeof PlaneLanding }> = [
  { id: 'arriving', label: 'Arriving', icon: PlaneLanding },
  { id: 'departed', label: 'Departed', icon: PlaneTakeoff },
  { id: 'ground', label: 'Ground', icon: SquareParking },
];
const CITY = new Map((airports as Array<{ code: string; city: string }>).map((a) => [a.code, a.city]));

interface Resp extends Board {
  airport: { code: string; name: string; city: string; country: string; lat: number; lon: number };
  updatedAt: string;
  stale: boolean;
}

function Row({ r, tab }: { r: BoardRow; tab: Tab }) {
  const { theme } = useTheme();
  const title = r.fn || r.cs || r.reg;
  const other = r.other ? `${CITY.get(r.other) ?? r.other}` : 'Route unknown';
  const status =
    tab === 'arriving'
      ? r.etaMin !== null
        ? r.etaMin < 3
          ? r.alt < 3000
            ? 'Landing now'
            : 'Approaching'
          : `in ~${fmtMinutes(r.etaMin)}`
        : `${fmtInt(r.km)} km out`
      : tab === 'departed'
        ? `${fmtInt(r.km)} km out`
        : r.spd > 25
          ? 'Taxiing'
          : 'Parked';
  return (
    <li>
      <Link href={`/?f=${r.id}&at=${r.lat.toFixed(2)},${r.lon.toFixed(2)}`} className="flex min-h-[64px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-panel-2">
        <AirlineLogo iata={iataOf(r.fn, r.al)} size={30} />
        <span className="w-[4.75rem] shrink-0 font-cond text-lead font-semibold">{title}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base">
            <span className="text-ink-3">{tab === 'arriving' ? 'from ' : tab === 'departed' ? 'to ' : ''}</span>
            {tab === 'ground' && !r.other ? airlineName(r.al) || r.type || 'Aircraft' : other}
            {r.other && <span className="ml-1 text-small text-ink-3">{r.other}</span>}
          </span>
          <span className="block truncate text-small text-ink-3">{[airlineName(r.al), r.type].filter(Boolean).join(' · ') || '—'}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className={cn('block text-small font-semibold', tab === 'arriving' && r.etaMin !== null && r.etaMin < 15 ? 'text-warn' : 'text-ink')}>{status}</span>
          {!r.gnd && (
            <span className="inline-flex items-center gap-1 text-micro text-ink-3">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: altColor(r.alt, false, theme) }} aria-hidden />
              {fmtInt(r.alt)} ft
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function AirportBoard({ code }: { code: string }) {
  const [tab, setTab] = useState<Tab>('arriving');
  const { data, isLoading, error } = useQuery({
    queryKey: ['board', code],
    queryFn: async () => {
      const res = await fetch(`/api/airport/${code}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'Board unavailable');
      return body as Resp;
    },
    refetchInterval: 15_000,
  });
  const rows = data ? data[tab] : [];

  return (
    <>
      <section className="relative -mx-4 h-[38dvh] min-h-[260px] overflow-hidden md:-mx-6 md:mt-2 md:h-[340px] md:rounded-[24px]">
        {data ? (
          <MiniMap
            className="absolute inset-0"
            center={[data.airport.lon, data.airport.lat]}
            zoom={6.2}
            dots={[{ code, lon: data.airport.lon, lat: data.airport.lat, weight: 1 }]}
            planes={[...data.arriving, ...data.departed, ...data.ground].map((r) => ({ lon: r.lon, lat: r.lat, hdg: r.hdg, alt: r.alt, gnd: r.gnd }))}
            label={`Live traffic around ${code}`}
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-panel" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night via-transparent to-night/40" />
        <Link href="/airports" className="glass absolute left-4 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-small text-ink-2 shadow-float hover:text-ink md:left-6">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Airports
        </Link>
      </section>
      <header className="relative -mt-16">
        <h1 className="font-cond text-[4.5rem] font-bold leading-[0.9] tracking-tight md:text-[6rem]">{code}</h1>
        <p className="mt-2 text-lead font-medium">{data?.airport.name ?? (isLoading ? '…' : '')}</p>
        <p className="text-base text-ink-2">
          {data ? `${data.airport.city}, ${data.airport.country}` : ''}
          {data?.airport.country === 'India' && <span className="text-ink-3"> · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} local</span>}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {data && (
            <Link href={`/?at=${data.airport.lat},${data.airport.lon}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-panel px-4 text-small font-semibold hairline hover:bg-panel-2">
              <MapIcon className="h-4 w-4" aria-hidden /> See on the map
            </Link>
          )}
          <Link href={`/fares?from=${code}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-panel px-4 text-small font-semibold hairline hover:bg-panel-2">
            <Ticket className="h-4 w-4" aria-hidden /> Fares from {code}
          </Link>
        </div>
      </header>

      <div className="mt-6">
        <AirportWeather code={code} />
      </div>

      {error && <p className="mt-8 rounded-panel bg-bad/10 p-4 text-base text-bad">{(error as Error).message}</p>}

      <div className="sticky top-0 z-20 -mx-4 mt-8 bg-night px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_8px_16px_-12px_rgb(0_0_0/0.5)] md:-mx-6 md:px-6 md:pt-3">
        <div role="tablist" aria-label="Board" className="grid grid-cols-3 gap-1 rounded-control bg-panel p-1 hairline">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] text-small font-semibold transition-colors', tab === id ? 'bg-panel-2 text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2')}
            >
              <Icon className={cn('h-4 w-4', tab === id && (id === 'departed' ? 'text-route' : 'text-data'))} aria-hidden />
              <span className="truncate">{label}</span>
              {data && <span className="text-ink-3">{data[id].length}</span>}
            </button>
          ))}
        </div>
      </div>

      <section role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="mt-2 overflow-hidden rounded-panel bg-panel hairline">
        {isLoading && Array.from({ length: 6 }, (_, i) => <div key={i} className="m-3 h-10 animate-pulse rounded bg-line/60" />)}
        {data && rows.length === 0 && (
          <p className="p-6 text-base text-ink-2">
            {tab === 'arriving' ? `No aircraft are inbound to ${code} right now.` : tab === 'departed' ? `Nothing has left ${code} recently that’s still in range.` : `No aircraft reporting on the ground at ${code}. Many parked planes switch off their transponder.`}
          </p>
        )}
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <Row key={r.id} r={r} tab={tab} />
          ))}
        </ul>
      </section>
      {data && (
        <p className="mt-3 text-small text-ink-3">
          From aircraft broadcasting their position, updated {fmtAgo(Date.parse(data.updatedAt))}. Times are estimates from distance and speed, not the airline schedule.
        </p>
      )}
    </>
  );
}
