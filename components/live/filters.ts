import { ALT_BANDS } from '@/lib/altitude';
import type { LiveFlight } from '@/types/flight';

export interface Filters {
  // Indices into ALT_BANDS that are hidden.
  hiddenBands: number[];
  airline: string | null;
  route: { from: string; to: string } | null;
}

export const NO_FILTERS: Filters = { hiddenBands: [], airline: null, route: null };

export const bandOf = (f: LiveFlight) => (f.gnd || f.alt <= 0 ? 0 : ALT_BANDS.findIndex((b) => f.alt <= b.max));

export function applyFilters(flights: LiveFlight[], fl: Filters): LiveFlight[] {
  if (!fl.hiddenBands.length && !fl.airline && !fl.route) return flights;
  return flights.filter(
    (f) =>
      !fl.hiddenBands.includes(bandOf(f)) &&
      (!fl.airline || f.al === fl.airline) &&
      (!fl.route || (f.org === fl.route.from && f.dst === fl.route.to) || (f.org === fl.route.to && f.dst === fl.route.from)),
  );
}

export const activeCount = (fl: Filters) => fl.hiddenBands.length + (fl.airline ? 1 : 0) + (fl.route ? 1 : 0);
