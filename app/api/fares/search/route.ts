import { NextRequest, NextResponse } from 'next/server';
import { badRequest, cached, isIsoDate, upstreamFailure } from '@/lib/api';
import { compare } from '@/lib/fares-provider';
import type { CabinClass, CompareRequest, SortBy } from '@/types/booking';

export const maxDuration = 30;

const CABINS: Record<string, CabinClass> = {
  economy: 'CABIN_CLASS_ECONOMY',
  premium: 'CABIN_CLASS_PREMIUM_ECONOMY',
  business: 'CABIN_CLASS_BUSINESS',
  first: 'CABIN_CLASS_FIRST',
};
const SORTS: SortBy[] = ['cheapest', 'fastest', 'best'];
const IATA = /^[A-Z]{3}$/;

// ?from=DEL&to=BOM&date=2026-10-28[&return=2026-11-02]&cabin=economy&adults=1&sort=cheapest
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = (sp.get('from') ?? '').toUpperCase();
  const to = (sp.get('to') ?? '').toUpperCase();
  const date = sp.get('date');
  const ret = sp.get('return');
  const cabin = CABINS[sp.get('cabin') ?? 'economy'];
  const adults = Number(sp.get('adults') ?? 1);
  const sort = (sp.get('sort') ?? 'cheapest') as SortBy;
  if (!IATA.test(from) || !IATA.test(to) || from === to) return badRequest('from and to must be different 3-letter airport codes');
  if (!isIsoDate(date) || (ret !== null && (!isIsoDate(ret) || ret < date))) return badRequest('date (and return) must be YYYY-MM-DD, return on or after date');
  if (!cabin) return badRequest('cabin must be economy, premium, business or first');
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) return badRequest('adults must be 1-9');
  if (!SORTS.includes(sort)) return badRequest('sort must be cheapest, fastest or best');

  const creq: CompareRequest = {
    trips: [{ source: from, destination: to, travelDate: date }, ...(ret ? [{ source: to, destination: from, travelDate: ret }] : [])],
    cabinClass: cabin,
    adults,
    currency: 'INR',
    sortBy: sort,
    sortOrder: 'asc',
    page: 1,
    limit: 40,
  };
  try {
    const key = `fares:${from}:${to}:${date}:${ret ?? ''}:${cabin}:${adults}:${sort}`;
    const res = await cached(key, 180, () => compare(creq));
    return NextResponse.json(res);
  } catch (err) {
    return upstreamFailure(err, 'fares-search');
  }
}
