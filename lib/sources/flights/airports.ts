import airportsRaw from '@/data/airports.min.json';

export interface AirportEntry {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

interface AirportRow {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

const airports: AirportEntry[] = (airportsRaw as AirportRow[]).map((a) => ({
  code: a.code.toUpperCase(),
  name: a.name,
  city: a.city,
  country: a.country,
  lat: a.lat,
  lon: a.lon,
}));

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function searchAirports(query: string, limit = 8): AirportEntry[] {
  const q = norm(query);
  if (!q) return [];
  const scored: { a: AirportEntry; sc: number }[] = [];
  for (const a of airports) {
    const code = a.code.toLowerCase();
    const nName = norm(a.name);
    const nCity = norm(a.city);
    let sc = 0;
    if (code === q) sc = 100;
    else if (code.startsWith(q)) sc = 80;
    else if (nCity.startsWith(q) || nName.startsWith(q)) sc = 60;
    else if (nCity.includes(q) || nName.includes(q)) sc = 40;
    if (sc > 0) scored.push({ a, sc });
  }
  return scored
    .sort((x, y) => y.sc - x.sc || x.a.code.localeCompare(y.a.code))
    .slice(0, limit)
    .map((x) => x.a);
}

export function getAirport(code: string): AirportEntry | undefined {
  const c = code.toUpperCase();
  return airports.find((a) => a.code === c);
}
