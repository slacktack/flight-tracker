import { cached, fetchUpstreamJson } from '@/lib/api';
import type { AirportRef, FlightDetail } from '@/types/flight';
import { str } from './types';

const UA = 'FlightTracker/1.0 (+https://github.com/slacktack/flight-tracker)';
const H = { 'User-Agent': UA, Accept: 'application/json' };
const DAY = 86_400;

interface RawAirport {
  iata_code?: string;
  icao_code?: string;
  name?: string;
  municipality?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
}

const airport = (a: RawAirport | undefined): AirportRef | null =>
  a && typeof a.latitude === 'number' && typeof a.longitude === 'number'
    ? { iata: str(a.iata_code), icao: str(a.icao_code), name: str(a.name), city: str(a.municipality), country: str(a.country_name), lat: a.latitude, lon: a.longitude }
    : null;

export async function getRoute(callsign: string): Promise<FlightDetail['route']> {
  if (!/^[A-Z0-9]{3,8}$/.test(callsign)) return null;
  return cached(`fd:route:${callsign}`, 6 * 3600, async () => {
    const json = await fetchUpstreamJson<{ response?: { flightroute?: { airline?: { name?: string; iata?: string; icao?: string }; origin?: RawAirport; destination?: RawAirport } } | string }>(
      'adsbdb',
      `https://api.adsbdb.com/v0/callsign/${callsign}`,
      { headers: H, timeoutMs: 8_000 },
    ).catch(() => null);
    const r = json && typeof json.response === 'object' ? json.response.flightroute : undefined;
    if (!r) return null;
    return {
      airline: r.airline?.name ? { name: str(r.airline.name), iata: str(r.airline.iata), icao: str(r.airline.icao) } : null,
      origin: airport(r.origin),
      destination: airport(r.destination),
    };
  });
}

export async function getAircraft(hex: string): Promise<FlightDetail['aircraft']> {
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  return cached(`fd:ac:${hex}`, 7 * DAY, async () => {
    const json = await fetchUpstreamJson<{ response?: { aircraft?: Record<string, string> } | string }>('adsbdb', `https://api.adsbdb.com/v0/aircraft/${hex}`, {
      headers: H,
      timeoutMs: 8_000,
    }).catch(() => null);
    const a = json && typeof json.response === 'object' ? json.response.aircraft : undefined;
    if (a) {
      return {
        model: str(a.type),
        manufacturer: str(a.manufacturer),
        owner: str(a.registered_owner),
        type: str(a.icao_type),
        reg: str(a.registration),
        country: str(a.registered_owner_country_name),
      };
    }
    const h = await fetchUpstreamJson<Record<string, string>>('hexdb', `https://hexdb.io/api/v1/aircraft/${hex}`, { headers: H, timeoutMs: 8_000 }).catch(() => null);
    return h?.Registration
      ? { model: str(h.Type), manufacturer: str(h.Manufacturer), owner: str(h.RegisteredOwners), type: str(h.ICAOTypeCode), reg: str(h.Registration), country: '' }
      : null;
  });
}

export async function getPhoto(hex: string): Promise<FlightDetail['photo']> {
  if (!/^[0-9a-f]{6}$/.test(hex)) return null;
  return cached(`fd:photo:${hex}`, 7 * DAY, async () => {
    const json = await fetchUpstreamJson<{ photos?: Array<{ thumbnail?: { src?: string }; thumbnail_large?: { src?: string }; link?: string; photographer?: string }> }>(
      'planespotters',
      `https://api.planespotters.net/pub/photos/hex/${hex}`,
      { headers: H, timeoutMs: 8_000 },
    ).catch(() => null);
    const p = json?.photos?.[0];
    if (!p?.thumbnail_large?.src) return null;
    return { thumb: str(p.thumbnail?.src), large: str(p.thumbnail_large.src), link: str(p.link), photographer: str(p.photographer) };
  });
}

const GAP_S = 25 * 60;

// OpenSky path rows: [epoch, lat, lon, baroAltM, track, onGround]. The track can include the
// aircraft's previous flight, so keep only what follows its last ground point or data gap.
export function parseTrack(path: unknown[][]): FlightDetail['trail'] {
  const rows = path.filter((p) => typeof p[1] === 'number' && typeof p[2] === 'number') as Array<[number, number, number, number | null, number, boolean]>;
  let start = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] - rows[i - 1][0] > GAP_S) start = i;
    if (rows[i - 1][5] && !rows[i][5]) start = i - 1;
  }
  return rows.slice(start).map(([t, lat, lon, alt]) => [lon, lat, Math.round((alt ?? 0) * 3.28084), t]);
}

export async function getTrail(hex: string): Promise<FlightDetail['trail']> {
  if (!/^[0-9a-f]{6}$/.test(hex)) return [];
  return cached(`fd:trail:${hex}`, 60, async () => {
    const json = await fetchUpstreamJson<{ path?: unknown[][] }>('opensky', `https://opensky-network.org/api/tracks/all?icao24=${hex}&time=0`, {
      headers: H,
      timeoutMs: 8_000,
    }).catch(() => null);
    return parseTrack(json?.path ?? []);
  });
}

export async function getFlightDetail(hex: string, callsign: string): Promise<FlightDetail> {
  const [route, aircraft, photo, trail] = await Promise.all([
    getRoute(callsign).catch(() => null),
    getAircraft(hex).catch(() => null),
    getPhoto(hex).catch(() => null),
    getTrail(hex).catch(() => []),
  ]);
  return { route, aircraft, photo, trail };
}
