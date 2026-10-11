'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PlaneLanding, PlaneTakeoff } from 'lucide-react';
import { PlacePicker } from '@/components/ui/PlacePicker';
import { fmtAgo } from '@/lib/format';

interface Busy {
  code: string;
  name: string;
  city: string;
  inbound: number;
  outbound: number;
  total: number;
}

export function AirportsIndex() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['busy'],
    queryFn: async () => (await (await fetch('/api/airports/busy')).json()) as { airports: Busy[]; updatedAt: string },
    refetchInterval: 30_000,
  });
  const max = Math.max(1, ...(data?.airports ?? []).map((a) => a.total));

  return (
    <>
      <header className="pt-10 md:pt-6">
        <h1 className="font-cond text-hero font-bold leading-none tracking-tight">Airports</h1>
        <p className="mt-2 max-w-md text-base text-ink-2">Who’s landing and taking off right now, built from the aircraft in the sky.</p>
      </header>

      <div className="glass mt-6 rounded-panel px-4 py-3 shadow-float">
        <PlacePicker label="Find an airport" value={null} onChange={(p) => router.push(`/airport/${p.iata}`)} placeholder="City, airport or code" />
      </div>

      <section className="mt-8" aria-labelledby="busy-h">
        <div className="flex items-baseline justify-between">
          <h2 id="busy-h" className="text-lead font-semibold">Busiest right now</h2>
          {data && <p className="text-small text-ink-3">updated {fmtAgo(Date.parse(data.updatedAt))}</p>}
        </div>
        {isError && <p className="mt-4 text-base text-ink-2">The live feed isn’t answering. Search for an airport above instead.</p>}
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {isLoading &&
            Array.from({ length: 6 }, (_, i) => <li key={i} className="h-[84px] animate-pulse rounded-panel bg-panel" />)}
          {data?.airports.map((a) => (
            <li key={a.code}>
              <Link href={`/airport/${a.code}`} className="group flex items-center gap-4 rounded-panel bg-panel p-4 transition-colors hover:bg-panel-2 hairline">
                <span className="w-16 shrink-0 font-cond text-code font-bold leading-none">{a.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{a.city}</span>
                  <span className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                    <span className="bg-data" style={{ width: `${(a.inbound / max) * 100}%` }} />
                    <span className="bg-route" style={{ width: `${(a.outbound / max) * 100}%` }} />
                  </span>
                  <span className="mt-1.5 flex gap-3 text-small text-ink-2">
                    <span className="inline-flex items-center gap-1">
                      <PlaneLanding className="h-3.5 w-3.5 text-data" aria-hidden /> {a.inbound} arriving
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <PlaneTakeoff className="h-3.5 w-3.5 text-route" aria-hidden /> {a.outbound} departed
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
