'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import runways from '@/data/runways.json';
import { cn } from '@/lib/cn';
import { fmtAgo } from '@/lib/format';
import type { Metar } from '@/lib/sources/weather';

const WX: Record<string, string> = {
  HZ: 'Haze', BR: 'Mist', FG: 'Fog', FU: 'Smoke', DU: 'Dust', SA: 'Sand', RA: 'Rain', DZ: 'Drizzle', SN: 'Snow',
  TS: 'Thunderstorm', SH: 'Showers', VC: 'nearby', GR: 'Hail', SQ: 'Squalls', MI: 'Shallow', BC: 'Patches',
};
const COVER: Record<string, string> = { FEW: 'Few clouds', SCT: 'Scattered clouds', BKN: 'Broken clouds', OVC: 'Overcast', CLR: 'Clear', SKC: 'Clear', CAVOK: 'Clear', NSC: 'No significant cloud' };
const CAT: Record<string, { label: string; cls: string; hint: string }> = {
  VFR: { label: 'VFR', cls: 'bg-good/15 text-good', hint: 'Good visibility and high cloud' },
  MVFR: { label: 'MVFR', cls: 'bg-data/15 text-data', hint: 'Marginal: some low cloud or haze' },
  IFR: { label: 'IFR', cls: 'bg-bad/15 text-bad', hint: 'Low cloud or poor visibility; instrument approaches' },
  LIFR: { label: 'LIFR', cls: 'bg-route/15 text-route', hint: 'Very low cloud or fog' },
};

export function describeWx(code: string): string {
  if (!code) return '';
  const intensity = code.startsWith('-') ? 'Light ' : code.startsWith('+') ? 'Heavy ' : '';
  const body = code.replace(/^[-+]/, '');
  const parts = body.match(/.{2}/g) ?? [];
  const words = parts.map((p) => WX[p] ?? p);
  return (intensity + words.join(' ')).trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

interface Rw {
  id: string;
  len: number;
  a: [number, number];
  b: [number, number];
}

// Runway ends are numbered by magnetic heading / 10; aircraft land and take off into the wind.
function likelyRunway(rws: Rw[], windDir: number | null, windKt: number | null): string | null {
  if (windDir === null || !windKt || windKt < 3) return null;
  let best: { end: string; score: number } | null = null;
  for (const r of rws) {
    for (const end of r.id.split('/')) {
      const hdg = parseInt(end, 10) * 10;
      if (!Number.isFinite(hdg)) continue;
      const score = Math.cos(((windDir - hdg) * Math.PI) / 180);
      if (!best || score > best.score) best = { end, score };
    }
  }
  return best && best.score > 0.3 ? best.end : null;
}

function RunwayDiagram({ code, metar }: { code: string; metar: Metar | null }) {
  const rws = ((runways as unknown as Record<string, Rw[]>)[code] ?? []).filter((r) => r.len > 3000);
  const geo = useMemo(() => {
    if (!rws.length) return null;
    const pts = rws.flatMap((r) => [r.a, r.b]);
    const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xy = (p: [number, number]) => [p[0] * k, -p[1]] as const;
    const all = pts.map(xy);
    const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
    const span = Math.max(maxX - minX, maxY - minY) || 0.01;
    const map = (p: [number, number]) => {
      const [x, y] = xy(p);
      return [20 + ((x - minX) / span) * 160 + (160 - ((maxX - minX) / span) * 160) / 2, 20 + ((y - minY) / span) * 160 + (160 - ((maxY - minY) / span) * 160) / 2] as const;
    };
    return rws.map((r) => ({ ...r, A: map(r.a), B: map(r.b) }));
  }, [rws]);
  if (!geo) return null;
  const active = likelyRunway(rws, metar?.windDir ?? null, metar?.windKt ?? null);
  return (
    <div className="rounded-panel bg-panel p-4 hairline">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Runways</h3>
        {active && <p className="text-small text-ink-2">Likely in use: <span className="font-cond text-lead font-semibold text-route">{active}</span></p>}
      </div>
      <svg viewBox="0 0 200 200" className="mx-auto mt-2 h-48 w-48" role="img" aria-label={`Runway layout: ${rws.map((r) => r.id).join(', ')}`}>
        {metar?.windDir !== null && metar?.windDir !== undefined && (metar.windKt ?? 0) > 0 && (
          <g transform={`rotate(${metar.windDir} 100 100)`} opacity="0.5">
            <path d="M100 6 L100 40 M93 30 L100 40 L107 30" stroke="rgb(var(--data))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        )}
        {geo.map((r) => {
          const [e1, e2] = r.id.split('/');
          const on = (e: string) => e === active;
          return (
            <g key={r.id}>
              <line x1={r.A[0]} y1={r.A[1]} x2={r.B[0]} y2={r.B[1]} stroke={on(e1) || on(e2) ? 'rgb(var(--route))' : 'rgb(var(--ink-2))'} strokeWidth="7" strokeLinecap="butt" />
              <line x1={r.A[0]} y1={r.A[1]} x2={r.B[0]} y2={r.B[1]} stroke="rgb(var(--panel))" strokeWidth="1" strokeDasharray="4 4" />
              <text x={r.A[0]} y={r.A[1]} dy="-6" textAnchor="middle" className={cn('fill-ink-2 font-cond text-[11px] font-semibold', on(e1) && 'fill-route')}>{e1}</text>
              <text x={r.B[0]} y={r.B[1]} dy="14" textAnchor="middle" className={cn('fill-ink-2 font-cond text-[11px] font-semibold', on(e2) && 'fill-route')}>{e2}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-micro text-ink-3">{active ? 'Estimated from the wind: aircraft take off and land into it. ' : ''}Wind arrow shows where it blows from.</p>
    </div>
  );
}

export function AirportWeather({ code }: { code: string }) {
  const [raw, setRaw] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['wx', code],
    queryFn: async () => (await (await fetch(`/api/weather/airport/${code}`)).json()) as { metar: Metar | null; taf: string },
    staleTime: 300_000,
    refetchInterval: 600_000,
  });
  const m = data?.metar ?? null;
  const cat = m?.category ? CAT[m.category] : null;
  const cloud = m?.clouds[0];

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-panel bg-panel p-4 hairline">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Weather now</h3>
            {m && <p className="text-micro text-ink-3">Observed {fmtAgo(Date.parse(m.time))}</p>}
          </div>
          {cat && (
            <span className={cn('rounded-full px-2.5 py-1 text-micro font-bold', cat.cls)} title={cat.hint}>
              {cat.label}
            </span>
          )}
        </div>
        {isLoading && <div className="mt-3 h-16 animate-pulse rounded bg-line/60" />}
        {!isLoading && !m && <p className="mt-3 text-small text-ink-2">No weather report from this airport right now.</p>}
        {m && (
          <>
            <div className="mt-3 flex items-end gap-5">
              <p className="font-cond text-[3rem] font-bold leading-none">{m.tempC ?? '—'}°</p>
              <div className="pb-1 text-small text-ink-2">
                <p className="font-semibold text-ink">{describeWx(m.weather) || (cloud ? COVER[cloud.cover] ?? cloud.cover : 'Clear')}</p>
                {cat && <p>{cat.hint}</p>}
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-small">
              <div>
                <dt className="text-micro text-ink-3">Wind</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
                  {m.windDir !== null && (m.windKt ?? 0) > 0 && (
                    <svg viewBox="-10 -10 20 20" className="h-4 w-4" aria-hidden>
                      <path d="M0 8 0 -7 M-4 -3 0 -7 4 -3" stroke="rgb(var(--data))" strokeWidth="2" fill="none" strokeLinecap="round" transform={`rotate(${m.windDir + 180})`} />
                    </svg>
                  )}
                  {(m.windKt ?? 0) === 0 ? 'Calm' : `${m.windKt} kt${m.gustKt ? `, gusts ${m.gustKt}` : ''}`}
                </dd>
                {m.windDir !== null && (m.windKt ?? 0) > 0 && <dd className="text-micro text-ink-3">from {m.windDir}°</dd>}
              </div>
              <div>
                <dt className="text-micro text-ink-3">Visibility</dt>
                <dd className="mt-0.5 font-semibold">{m.visKm !== null ? `${m.visKm >= 10 ? '10+' : m.visKm} km` : '—'}</dd>
              </div>
              <div>
                <dt className="text-micro text-ink-3">Cloud base</dt>
                <dd className="mt-0.5 font-semibold">{cloud?.baseFt ? `${cloud.baseFt.toLocaleString('en-IN')} ft` : 'None low'}</dd>
              </div>
            </dl>
            <button type="button" onClick={() => setRaw((v) => !v)} aria-expanded={raw} className="mt-3 inline-flex min-h-9 items-center gap-1 text-small font-semibold text-ink-2 hover:text-ink">
              Pilot report <ChevronDown className={cn('h-4 w-4 transition-transform', raw && 'rotate-180')} aria-hidden />
            </button>
            {raw && (
              <pre className="mt-2 whitespace-pre-wrap rounded-control bg-panel-2 p-3 font-mono text-micro leading-relaxed text-ink-2">
                {m.raw}
                {data?.taf ? `\n\n${data.taf}` : ''}
              </pre>
            )}
          </>
        )}
      </div>
      <RunwayDiagram code={code} metar={m} />
    </div>
  );
}
