import airports from '@/data/airports.min.json';
import { distanceKm, greatCircle } from '@/lib/geo';
import type { AirportRef, FlightDetail, LiveFlight } from '@/types/flight';

export interface Endpoint {
  code: string;
  city: string;
  name: string;
  lat: number | null;
  lon: number | null;
}

const LOCAL = new Map((airports as Array<{ code: string; name: string; city: string; lat: number; lon: number }>).map((a) => [a.code, a]));

// FR24's per-flight codes win; adsbdb's callsign route is used only when it agrees or FR24 has none.
function endpoint(code: string, r: AirportRef | null): Endpoint | null {
  if (code) {
    if (r && (r.iata === code || r.icao === code)) return { code, city: r.city || r.name, name: r.name, lat: r.lat, lon: r.lon };
    const l = LOCAL.get(code);
    if (l) return { code, city: l.city, name: l.name, lat: l.lat, lon: l.lon };
    return { code, city: '', name: '', lat: null, lon: null };
  }
  if (r) return { code: r.iata || r.icao, city: r.city || r.name, name: r.name, lat: r.lat, lon: r.lon };
  return null;
}

export function resolveRoute(f: LiveFlight, detail: FlightDetail | undefined) {
  const route = detail?.route ?? null;
  // A callsign route that contradicts FR24 on both ends is a reused callsign: ignore it.
  const trusted = route && (!f.org || !f.dst || route.origin?.iata === f.org || route.destination?.iata === f.dst) ? route : null;
  const origin = endpoint(f.org, trusted?.origin ?? null);
  const destination = endpoint(f.dst, trusted?.destination ?? null);

  let progress: { flownKm: number; leftKm: number; pct: number; etaMin: number | null } | null = null;
  let ahead: Array<[number, number]> | null = null;
  let behind: Array<[number, number]> | null = null;
  if (origin?.lat != null && origin.lon != null && destination?.lat != null && destination.lon != null) {
    const flownKm = distanceKm(origin.lat, origin.lon, f.lat, f.lon);
    const leftKm = distanceKm(f.lat, f.lon, destination.lat, destination.lon);
    const pct = flownKm / Math.max(1, flownKm + leftKm);
    const kmh = f.spd * 1.852;
    // Final approach is slower than cruise; pad a little so the estimate isn't optimistic.
    const etaMin = kmh > 150 ? (leftKm / kmh) * 60 + Math.min(12, leftKm / 40) : null;
    progress = { flownKm, leftKm, pct, etaMin };
    ahead = greatCircle(f.lat, f.lon, destination.lat, destination.lon, 48);
    behind = greatCircle(origin.lat, origin.lon, f.lat, f.lon, 48);
  } else if (destination?.lat != null && destination.lon != null) {
    ahead = greatCircle(f.lat, f.lon, destination.lat, destination.lon, 48);
  }
  return { origin, destination, progress, ahead, behind };
}
