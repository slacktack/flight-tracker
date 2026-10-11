import { fetchUpstreamJson } from '@/lib/api';
import type { LiveFlight } from '@/types/flight';
import { BBox, num, str } from './types';

const UA = 'flight-tracker/1.0 (+https://github.com/slacktack/flight-tracker)';
const M_TO_FT = 3.28084;
const MS_TO_KT = 1.943844;

// states row: 0 hex, 1 callsign, 3 timePos, 5 lon, 6 lat, 7 baroAlt m, 8 onGround, 9 vel m/s, 10 track, 11 vRate m/s, 14 squawk
export function parseOpenSky(states: unknown[][]): LiveFlight[] {
  const out: LiveFlight[] = [];
  for (const s of states) {
    const lon = num(s[5]);
    const lat = num(s[6]);
    const hex = str(s[0]).toLowerCase();
    if (lat === null || lon === null || !hex) continue;
    const cs = str(s[1]).toUpperCase();
    out.push({
      id: hex,
      hex,
      fn: '',
      cs,
      lat,
      lon,
      alt: Math.round((num(s[7]) ?? 0) * M_TO_FT),
      spd: Math.round((num(s[9]) ?? 0) * MS_TO_KT),
      hdg: num(s[10]) ?? 0,
      vs: Math.round((num(s[11]) ?? 0) * M_TO_FT * 60),
      gnd: s[8] === true,
      type: '',
      reg: '',
      org: '',
      dst: '',
      al: /^[A-Z]{3}\d/.test(cs) ? cs.slice(0, 3) : '',
      sq: str(s[14]),
      t: num(s[3]) ?? 0,
    });
  }
  return out;
}

export async function fetchOpenSky(b: BBox) {
  const q = `lamin=${b.lamin}&lomin=${b.lomin}&lamax=${b.lamax}&lomax=${b.lomax}`;
  const json = await fetchUpstreamJson<{ states: unknown[][] | null }>('opensky', `https://opensky-network.org/api/states/all?${q}`, {
    timeoutMs: 10_000,
    headers: { 'User-Agent': UA },
  });
  return { flights: parseOpenSky(json.states ?? []), total: null };
}
