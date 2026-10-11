import { fetchUpstreamJson, UpstreamError } from '@/lib/api';
import type { CompareRequest, CompareResponse, FareDay, Itinerary, Leg, Place, Segment, Trip } from '@/types/booking';

// Server-only. Credentials come from env and never reach the client.
// Provider endpoint, origin and credentials all come from env.
const P = 'fares';

function config() {
  const base = process.env.FARES_API_BASE;
  const origin = process.env.FARES_API_ORIGIN;
  const extId = process.env.FARES_EXT_ID;
  const extAuth = process.env.FARES_EXT_AUTH;
  if (!base || !origin || !extId || !extAuth) throw new UpstreamError(P, 'fare search is not configured', 503);
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: `${origin}/`,
    Origin: origin,
    Accept: 'application/json',
  };
  return { base, headers, creds: { extId, extAuth } };
}

interface Envelope<T> {
  status: number;
  message: string;
  data: T;
}

const ok = <T>(j: Envelope<T>): T => {
  if (j.status !== 1) throw new UpstreamError(P, j.message || 'upstream error');
  return j.data;
};

const pad = (n: number) => String(n).padStart(2, '0');
interface RawDT { year: number; month: number; day: number; hour: number; minute: number }
const dt = (d: RawDT | undefined) => (d ? `${d.year}-${pad(d.month)}-${pad(d.day)}T${pad(d.hour)}:${pad(d.minute)}` : '');

interface RawCarrier { iata?: string; name?: string; imageUrl?: string }
const carrier = (c: RawCarrier | undefined) => ({ iata: c?.iata ?? '', name: c?.name ?? '', logo: c?.imageUrl ?? '' });

interface RawSegment {
  flightNumber?: string;
  marketingCarrier?: RawCarrier;
  origin?: { iata?: string };
  destination?: { iata?: string };
  departureDateTime?: RawDT;
  arrivalDateTime?: RawDT;
  durationInMinutes?: number;
}
interface RawLeg {
  carrier?: RawCarrier;
  origin?: { iata?: string; name?: string };
  destination?: { iata?: string; name?: string };
  departureDateTime?: RawDT;
  arrivalDateTime?: RawDT;
  durationInMinutes?: number;
  stopCount?: number;
  stopPlaces?: Array<{ iata?: string } | string>;
  segments?: RawSegment[];
}
interface RawItinerary {
  id: string;
  bestPrice: number;
  currency: string;
  legs?: RawLeg[];
  pricingOptions?: Array<{ price: number; items?: Array<{ price: number; deepLink: string; agent: { id: string; name: string; imageUrl: string } }> }>;
}

export function toItinerary(raw: RawItinerary): Itinerary {
  const legs: Leg[] = (raw.legs ?? []).map((l) => ({
    carrier: carrier(l.carrier),
    from: { iata: l.origin?.iata ?? '', name: l.origin?.name ?? '' },
    to: { iata: l.destination?.iata ?? '', name: l.destination?.name ?? '' },
    dep: dt(l.departureDateTime),
    arr: dt(l.arrivalDateTime),
    minutes: l.durationInMinutes ?? 0,
    stops: l.stopCount ?? 0,
    stopCodes: (l.stopPlaces ?? []).map((s) => (typeof s === 'string' ? s : s.iata ?? '')).filter(Boolean),
    segments: (l.segments ?? []).map<Segment>((s) => ({
      flightNumber: (s.flightNumber ?? '').replace(/\s+/g, ' ').trim(),
      carrier: carrier(s.marketingCarrier),
      from: s.origin?.iata ?? '',
      to: s.destination?.iata ?? '',
      dep: dt(s.departureDateTime),
      arr: dt(s.arrivalDateTime),
      minutes: s.durationInMinutes ?? 0,
    })),
  }));
  // One offer per agent, cheapest first.
  const seen = new Set<string>();
  const offers = (raw.pricingOptions ?? [])
    .flatMap((p) => (p.items ?? []).map((it) => ({ price: it.price, deepLink: it.deepLink, agent: { id: it.agent.id, name: it.agent.name.trim(), logo: it.agent.imageUrl } })))
    .sort((a, b) => a.price - b.price)
    .filter((o) => (seen.has(o.agent.id) ? false : (seen.add(o.agent.id), true)));
  return { id: raw.id, price: raw.bestPrice, currency: raw.currency, legs, offers };
}

// Results arrive asynchronously; poll until complete or ~12s pass.
export async function compare(req: CompareRequest): Promise<CompareResponse> {
  const { base, headers, creds } = config();
  const body = JSON.stringify({ ...creds, platform: 3, childrenAges: [], ...req });
  let last: { itineraries?: RawItinerary[]; total?: number; pollingStatus?: string } = {};
  for (let i = 0; i < 6; i += 1) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));
    last = ok(
      await fetchUpstreamJson<Envelope<typeof last>>(P, `${base}/compareFlightsV2`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body,
        timeoutMs: 15_000,
      }),
    );
    if (last.pollingStatus === 'RESULT_STATUS_COMPLETE' && (last.itineraries?.length ?? 0) > 0) break;
    if ((last.itineraries?.length ?? 0) >= req.limit) break;
  }
  return {
    itineraries: (last.itineraries ?? []).map(toItinerary),
    total: last.total ?? 0,
    complete: last.pollingStatus === 'RESULT_STATUS_COMPLETE',
  };
}

export async function autosuggest(q: string): Promise<Place[]> {
  const { base, headers } = config();
  const data = ok(
    await fetchUpstreamJson<Envelope<Array<{ iataCode?: string; name?: string; cityName?: string; countryName?: string; type?: string }>>>(
      P,
      `${base}/autoSuggestFlights?searchTerm=${encodeURIComponent(q)}`,
      { headers, timeoutMs: 10_000 },
    ),
  );
  return data
    .filter((p) => p.iataCode)
    .map((p) => ({ iata: p.iataCode!, name: p.name ?? '', city: p.cityName ?? '', country: p.countryName ?? '', type: p.type === 'PLACE_TYPE_AIRPORT' ? 'airport' : 'city' }));
}

// Keys look like "true_2026-10-31": nonstop flag + date.
export function parseIndicative(data: Record<string, number>): FareDay[] {
  const best = new Map<string, FareDay>();
  for (const [k, price] of Object.entries(data)) {
    const m = k.match(/^(true|false)_(\d{4}-\d{2}-\d{2})$/);
    if (!m || typeof price !== 'number') continue;
    const day = { date: m[2], price, nonstop: m[1] === 'true' };
    const cur = best.get(day.date);
    if (!cur || price < cur.price) best.set(day.date, day);
  }
  return Array.from(best.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fareCalendar(trip: Trip, currency: string): Promise<FareDay[]> {
  const { base, headers } = config();
  const qs = new URLSearchParams({ trips: JSON.stringify([trip]), currency, dateTimeGroupingType: 'DATE_TIME_GROUPING_TYPE_BY_DATE' });
  return parseIndicative(ok(await fetchUpstreamJson<Envelope<Record<string, number>>>(P, `${base}/indicativeSearchV2?${qs}`, { headers, timeoutMs: 15_000 })));
}
