import { distanceKm } from '@/lib/geo';
import type { LiveFlight } from '@/types/flight';

export interface BoardRow {
  id: string;
  fn: string;
  cs: string;
  al: string;
  type: string;
  reg: string;
  other: string;
  lat: number;
  lon: number;
  alt: number;
  spd: number;
  vs: number;
  gnd: boolean;
  km: number;
  etaMin: number | null;
}

export interface Board {
  arriving: BoardRow[];
  departed: BoardRow[];
  ground: BoardRow[];
}

const GROUND_KM = 6;

const row = (f: LiveFlight, other: string, km: number, etaMin: number | null): BoardRow => ({
  id: f.id, fn: f.fn, cs: f.cs, al: f.al, type: f.type, reg: f.reg, other, lat: f.lat, lon: f.lon, alt: f.alt, spd: f.spd, vs: f.vs, gnd: f.gnd, km, etaMin,
});

export function buildBoard(flights: LiveFlight[], code: string, lat: number, lon: number): Board {
  const arriving: BoardRow[] = [];
  const departed: BoardRow[] = [];
  const ground: BoardRow[] = [];
  for (const f of flights) {
    const km = distanceKm(lat, lon, f.lat, f.lon);
    if (f.gnd && km <= GROUND_KM) {
      ground.push(row(f, f.org === code ? f.dst : f.org, km, null));
      continue;
    }
    if (f.gnd) continue;
    if (f.dst === code) {
      const kmh = f.spd * 1.852;
      arriving.push(row(f, f.org, km, kmh > 150 ? (km / kmh) * 60 + Math.min(12, km / 40) : null));
    } else if (f.org === code) departed.push(row(f, f.dst, km, null));
  }
  arriving.sort((a, b) => (a.etaMin ?? 1e9) - (b.etaMin ?? 1e9));
  departed.sort((a, b) => a.km - b.km);
  ground.sort((a, b) => (a.fn || a.cs).localeCompare(b.fn || b.cs));
  return { arriving, departed, ground };
}
