import { fetchUpstreamJson } from '@/lib/api';
import type { LiveFlight } from '@/types/flight';
import { BBox, num, str } from './types';

// Primary feed: FR24 data-cloud (works server-side). Never data-live: it 302s to a dead file.
const FEED_BASE = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js';
const FR24 = 'https://www.flightradar24.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
const LIMIT = 1500;

// Row: [hex, lat, lon, track, altFt, speedKt, squawk, radar, type, reg, epoch, from, to, flightNo, onGround, vsFpm, callsign, glider, airlineIcao]
type Row = Array<string | number | null>;

export function fr24FeedUrl(b: BBox): string {
  const bounds = `${b.lamax},${b.lamin},${b.lomin},${b.lomax}`;
  return `${FEED_BASE}?bounds=${encodeURIComponent(bounds)}&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=1&limit=${LIMIT}`;
}

export function parseFr24(json: Record<string, unknown>): { flights: LiveFlight[]; total: number | null } {
  const flights: LiveFlight[] = [];
  for (const [id, raw] of Object.entries(json)) {
    if (!Array.isArray(raw)) continue;
    const r = raw as Row;
    const lat = num(r[1]);
    const lon = num(r[2]);
    if (lat === null || lon === null) continue;
    const hex = str(r[0]).toLowerCase();
    const fn = str(r[13]).toUpperCase();
    const cs = str(r[16]).toUpperCase();
    const reg = str(r[9]).toUpperCase();
    if (!hex && !fn && !cs && !reg) continue;
    flights.push({
      id,
      hex,
      fn,
      cs,
      lat,
      lon,
      alt: num(r[4]) ?? 0,
      spd: num(r[5]) ?? 0,
      hdg: num(r[3]) ?? 0,
      vs: num(r[15]) ?? 0,
      gnd: num(r[14]) === 1,
      type: str(r[8]).toUpperCase(),
      reg,
      org: str(r[11]).toUpperCase(),
      dst: str(r[12]).toUpperCase(),
      al: str(r[18]).toUpperCase(),
      sq: str(r[6]),
      t: num(r[10]) ?? 0,
    });
  }
  return { flights, total: num(json.full_count) };
}

export async function fetchFr24(bbox: BBox) {
  const json = await fetchUpstreamJson<Record<string, unknown>>('fr24', fr24FeedUrl(bbox), {
    timeoutMs: 10_000,
    headers: { 'User-Agent': UA, Referer: `${FR24}/`, Origin: FR24, Accept: '*/*' },
  });
  const out = parseFr24(json);
  if (out.flights.length === 0 && !json.full_count) throw new Error('fr24: empty feed');
  return out;
}
