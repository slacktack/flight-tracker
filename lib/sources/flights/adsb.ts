import { fetchUpstreamJson } from '@/lib/api';
import type { LiveFlight } from '@/types/flight';
import { BBox, bboxCenter, num, str } from './types';

const UA = 'flight-tracker/1.0 (+https://github.com/slacktack/flight-tracker)';

interface Ac {
  hex?: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  gs?: number;
  track?: number;
  baro_rate?: number;
  squawk?: string;
  seen_pos?: number;
}

export function parseAdsb(ac: Ac[], now: number): LiveFlight[] {
  const out: LiveFlight[] = [];
  for (const a of ac) {
    const hex = str(a.hex).toLowerCase();
    const lat = num(a.lat);
    const lon = num(a.lon);
    if (!hex || lat === null || lon === null) continue;
    const cs = str(a.flight).toUpperCase();
    const gnd = a.alt_baro === 'ground';
    out.push({
      id: hex,
      hex,
      fn: '',
      cs,
      lat,
      lon,
      alt: gnd ? 0 : num(a.alt_baro) ?? 0,
      spd: num(a.gs) ?? 0,
      hdg: num(a.track) ?? 0,
      vs: num(a.baro_rate) ?? 0,
      gnd,
      type: str(a.t).toUpperCase(),
      reg: str(a.r).toUpperCase(),
      org: '',
      dst: '',
      al: /^[A-Z]{3}\d/.test(cs) ? cs.slice(0, 3) : '',
      sq: str(a.squawk),
      t: Math.round(now / 1000 - (num(a.seen_pos) ?? 0)),
    });
  }
  return out;
}

export async function fetchAdsb(b: BBox) {
  const { lat, lon, distNm } = bboxCenter(b);
  const json = await fetchUpstreamJson<{ ac?: Ac[] }>('adsb', `https://api.adsb.lol/v2/lat/${lat.toFixed(3)}/lon/${lon.toFixed(3)}/dist/${distNm}`, {
    timeoutMs: 10_000,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  return { flights: parseAdsb(json.ac ?? [], Date.now()), total: null };
}
