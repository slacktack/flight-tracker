import { NextResponse } from 'next/server';
import { badRequest, upstreamFailure } from '@/lib/api';
import { buildBoard } from '@/lib/boards';
import { getLiveFeed } from '@/lib/sources/flights';
import { getAirport } from '@/lib/sources/flights/airports';

export const dynamic = 'force-dynamic';

// Arrivals, departures and parked aircraft built from what's in the sky right now.
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return badRequest('code must be a 3-letter airport code');
  const a = getAirport(code);
  if (!a) return NextResponse.json({ error: `We don't have ${code} in our airport list yet`, code: 'not_found' }, { status: 404 });
  const snap = (n: number, up: boolean) => (up ? Math.ceil(n * 2) : Math.floor(n * 2)) / 2;
  const bbox = { lamin: snap(Math.max(-85, a.lat - 18), false), lamax: snap(Math.min(85, a.lat + 18), true), lomin: snap(Math.max(-180, a.lon - 28), false), lomax: snap(Math.min(180, a.lon + 28), true) };
  try {
    const feed = await getLiveFeed(bbox);
    return NextResponse.json(
      { airport: a, source: feed.source, updatedAt: feed.updatedAt, stale: feed.stale, ...buildBoard(feed.flights, code, a.lat, a.lon) },
      { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' } },
    );
  } catch (err) {
    return upstreamFailure(err, 'airport-board');
  }
}
