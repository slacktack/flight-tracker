import { cached, fetchUpstreamJson, fetchUpstream } from '@/lib/api';

const UA = { 'User-Agent': 'FlightTracker/1.0 (+https://github.com/slacktack/flight-tracker)', Accept: 'application/json' };

export type FlightCategory = 'VFR' | 'MVFR' | 'IFR' | 'LIFR';

export interface Metar {
  icao: string;
  time: string;
  tempC: number | null;
  dewC: number | null;
  windDir: number | null; // null when variable
  windKt: number | null;
  gustKt: number | null;
  visKm: number | null;
  clouds: Array<{ cover: string; baseFt: number | null }>;
  weather: string;
  qnh: number | null;
  category: FlightCategory | null;
  raw: string;
}

interface RawMetar {
  icaoId?: string;
  reportTime?: string;
  temp?: number;
  dewp?: number;
  wdir?: number | string;
  wspd?: number;
  wgst?: number;
  visib?: number | string;
  clouds?: Array<{ cover?: string; base?: number | null }>;
  wxString?: string;
  altim?: number;
  fltCat?: string;
  rawOb?: string;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseMetar(r: RawMetar): Metar {
  const vis = typeof r.visib === 'string' ? (r.visib.includes('+') ? 10 : Number(r.visib)) : r.visib;
  return {
    icao: r.icaoId ?? '',
    time: r.reportTime ?? '',
    tempC: n(r.temp),
    dewC: n(r.dewp),
    windDir: typeof r.wdir === 'number' ? r.wdir : null,
    windKt: n(r.wspd),
    gustKt: n(r.wgst),
    // AWC reports statute miles
    visKm: n(vis) === null ? null : Math.round((vis as number) * 1.609 * 10) / 10,
    clouds: (r.clouds ?? []).map((c) => ({ cover: c.cover ?? '', baseFt: n(c.base) })),
    weather: r.wxString ?? '',
    qnh: n(r.altim),
    category: (['VFR', 'MVFR', 'IFR', 'LIFR'] as const).find((c) => c === r.fltCat) ?? null,
    raw: r.rawOb ?? '',
  };
}

export async function getMetars(icaos: string[]): Promise<Metar[]> {
  const ids = icaos.filter((c) => /^[A-Z0-9]{4}$/.test(c));
  if (!ids.length) return [];
  const out: Metar[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const rows = await fetchUpstreamJson<RawMetar[]>('aviationweather', `https://aviationweather.gov/api/data/metar?ids=${chunk.join(',')}&format=json`, { headers: UA, timeoutMs: 12_000 });
    out.push(...(rows ?? []).map(parseMetar));
  }
  return out;
}

export async function getTaf(icao: string): Promise<string> {
  if (!/^[A-Z0-9]{4}$/.test(icao)) return '';
  return cached(`taf:${icao}`, 1800, async () => {
    const res = await fetchUpstream('aviationweather', `https://aviationweather.gov/api/data/taf?ids=${icao}&format=raw`, { headers: { ...UA, Accept: 'text/plain' }, timeoutMs: 10_000 });
    return res.ok ? (await res.text()).trim() : '';
  });
}

export async function getRadarFrame(): Promise<{ host: string; path: string; time: number } | null> {
  return cached('radar:latest', 300, async () => {
    const j = await fetchUpstreamJson<{ host?: string; radar?: { past?: Array<{ time: number; path: string }> } }>('rainviewer', 'https://api.rainviewer.com/public/weather-maps.json', { headers: UA, timeoutMs: 8_000 });
    const last = j.radar?.past?.at(-1);
    return j.host && last ? { host: j.host, path: last.path, time: last.time } : null;
  });
}
