import { NextRequest, NextResponse } from 'next/server';
import { badRequest, cached } from '@/lib/api';
import { autosuggest } from '@/lib/fares-provider';
import { searchAirports } from '@/lib/sources/flights/airports';
import type { Place } from '@/types/booking';

// Airports by code, city or name: the local list first, the fares provider for the rest.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 1 || q.length > 40 || !/^[A-Za-z\u00C0-\u024F .'-]+$/.test(q)) return badRequest('q must be 1-40 letters');
  const local: Place[] = searchAirports(q, 8).map((a) => ({ iata: a.code, name: a.name, city: a.city, country: a.country, type: 'airport' }));
  let remote: Place[] = [];
  if (q.length >= 2) remote = await cached(`places:${q.toLowerCase()}`, 3600, () => autosuggest(q)).catch(() => []);
  const seen = new Set<string>();
  const places = [...local, ...remote].filter((p) => (seen.has(p.iata) ? false : (seen.add(p.iata), true))).slice(0, 10);
  return NextResponse.json({ places });
}
