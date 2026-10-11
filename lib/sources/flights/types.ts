export interface BBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

// Rounds to a 0.5° grid so nearby viewports share one cache entry.
export function parseBBox(raw: string | null): BBox | null {
  if (!raw) return null;
  const parts = raw.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  let [lamin, lomin, lamax, lomax] = parts;
  lamin = Math.max(-85, Math.floor(lamin * 2) / 2);
  lomin = Math.max(-180, Math.floor(lomin * 2) / 2);
  lamax = Math.min(85, Math.ceil(lamax * 2) / 2);
  lomax = Math.min(180, Math.ceil(lomax * 2) / 2);
  if (lamin >= lamax || lomin >= lomax) return null;
  if (lamax - lamin > 40 || lomax - lomin > 60) return null;
  return { lamin, lomin, lamax, lomax };
}

export function bboxCenter(b: BBox): { lat: number; lon: number; distNm: number } {
  const lat = (b.lamin + b.lamax) / 2;
  const lon = (b.lomin + b.lomax) / 2;
  const dLat = ((b.lamax - b.lamin) / 2) * 60;
  const dLon = ((b.lomax - b.lomin) / 2) * 60 * Math.cos((lat * Math.PI) / 180);
  return { lat, lon, distNm: Math.min(250, Math.max(25, Math.ceil(Math.hypot(dLat, dLon)))) };
}

export const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
