'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { PlacePicker } from '@/components/ui/PlacePicker';
import { MiniMap } from '@/components/ui/MiniMap';
import { fmtAgo, fmtInt } from '@/lib/format';

interface Busy {
  code: string;
  name: string;
  city: string;
  lat: number;
  lon: number;
  inbound: number;
  outbound: number;
  total: number;
}
interface Resp {
  airports: Busy[];
  routes: Array<{ from: string; to: string; n: number; a: [number, number]; b: [number, number] }>;
  updatedAt: string;
}

export function AirportsIndex() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['busy'],
    queryFn: async () => (await (await fetch('/api/airports/busy')).json()) as Resp,
    refetchInterval: 30_000,
  });
  const max = Math.max(1, ...(data?.airports ?? []).map((a) => a.total));
  const totalAir = (data?.airports ?? []).reduce((s, a) => s + a.inbound, 0);

  return (
    <>
      <section className="relative -mx-4 h-[44dvh] min-h-[320px] overflow-hidden md:-mx-6 md:mt-2 md:h-[420px] md:rounded-[24px]">
        <MiniMap
          className="absolute inset-0"
          center={[80, 22.5]}
          zoom={3.7}
          dots={(data?.airports ?? []).map((a) => ({ code: a.code, lon: a.lon, lat: a.lat, weight: a.total }))}
          arcs={(data?.routes ?? []).map((r) => ({ a: r.a, b: r.b, weight: r.n }))}
          label="Map of India's busiest airports and routes right now"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 pb-5 md:px-8 md:pb-8">
          <p className="text-small font-medium text-data">{data ? `${fmtInt(totalAir)} flights inbound to these airports` : 'Reading the sky…'}</p>
          <h1 className="mt-1 font-cond text-hero font-bold leading-none tracking-tight md:text-[4.5rem]">Airports</h1>
          <p className="mt-2 max-w-md text-base text-ink-2">Who’s landing and taking off right now, built from the aircraft in the sky.</p>
        </div>
      </section>

      <div className="glass relative z-10 mt-4 rounded-panel px-4 py-3 shadow-float">
        <PlacePicker label="Find an airport" value={null} onChange={(p) => router.push(`/airport/${p.iata}`)} placeholder="City, airport or code" />
      </div>

      {data && data.routes.length > 0 && (
        <section className="mt-8" aria-labelledby="routes-h">
          <h2 id="routes-h" className="text-lead font-semibold">Busiest routes in the air</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {data.routes.slice(0, 10).map((r) => (
              <Link
                key={`${r.from}-${r.to}`}
                href={`/?route=${r.from}-${r.to}`}
                className="shrink-0 rounded-panel bg-panel px-4 py-3 hairline transition-colors hover:bg-panel-2"
              >
                <span className="block font-cond text-title font-semibold leading-none">
                  {r.from} <span className="text-route">⇄</span> {r.to}
                </span>
                <span className="mt-1 block text-small text-ink-3">{r.n} flying now</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="busy-h">
        <div className="flex items-baseline justify-between">
          <h2 id="busy-h" className="text-lead font-semibold">Busiest right now</h2>
          {data && <p className="text-small text-ink-3">updated {fmtAgo(Date.parse(data.updatedAt))}</p>}
        </div>
        {isError && <p className="mt-4 text-base text-ink-2">The live feed isn’t answering. Search for an airport above instead.</p>}
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {isLoading && Array.from({ length: 6 }, (_, i) => <li key={i} className="h-[92px] animate-pulse rounded-panel bg-panel" />)}
          {data?.airports.map((a, i) => (
            <li key={a.code} className="animate-fade" style={{ animationDelay: `${i * 30}ms` }}>
              <Link href={`/airport/${a.code}`} className="group relative flex items-center gap-4 overflow-hidden rounded-panel bg-panel p-4 transition-colors hairline hover:bg-panel-2">
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-data to-route opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                <span className="w-6 shrink-0 text-right text-small font-semibold text-ink-3">{i + 1}</span>
                <span className="w-[4.25rem] shrink-0 font-cond text-code font-bold leading-none">{a.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{a.city}</span>
                  <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="bg-data transition-[width] duration-700" style={{ width: `${(a.inbound / max) * 100}%` }} />
                    <span className="bg-route transition-[width] duration-700" style={{ width: `${(a.outbound / max) * 100}%` }} />
                  </span>
                  <span className="mt-1.5 flex gap-3 text-small text-ink-2">
                    <span className="inline-flex items-center gap-1">
                      <PlaneLanding className="h-3.5 w-3.5 text-data" aria-hidden /> {a.inbound}
                      <span className="hidden xs:inline">arriving</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <PlaneTakeoff className="h-3.5 w-3.5 text-route" aria-hidden /> {a.outbound}
                      <span className="hidden xs:inline">departed</span>
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
