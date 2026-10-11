const nf = new Intl.NumberFormat('en-IN');

export const fmtInt = (n: number) => nf.format(Math.round(n));
export const fmtFt = (n: number) => `${nf.format(Math.round(n / 25) * 25)} ft`;
export const fmtKt = (n: number) => `${Math.round(n)} kt`;
export const ktToKmh = (n: number) => Math.round(n * 1.852);
export const fmtInr = (n: number) => `₹${nf.format(Math.round(n))}`;

export function fmtMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function fmtAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

// "2026-10-28T19:00" -> "19:00"
export const hhmm = (local: string) => local.slice(11, 16);

export function fmtDayShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// Whole days from a's date to b's date, for "+1" next-day markers.
export function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);
}

export function todayIso(offsetDays = 0): string {
  return new Date(Date.now() + 5.5 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

// Direction words for a track in degrees.
export function compass(deg: number): string {
  return ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
