import { NextRequest, NextResponse } from 'next/server';
import { badRequest, upstreamFailure } from '@/lib/api';
import { getLiveFeed, parseBBox } from '@/lib/sources/flights';

export const dynamic = 'force-dynamic';

// Live aircraft in a viewport: ?bbox=lamin,lomin,lamax,lomax (snapped to 0.5°, max 40×60°).
export async function GET(req: NextRequest) {
  const bbox = parseBBox(req.nextUrl.searchParams.get('bbox'));
  if (!bbox) return badRequest('bbox must be lamin,lomin,lamax,lomax within 40° lat × 60° lon');
  try {
    return NextResponse.json(await getLiveFeed(bbox), { headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (err) {
    return upstreamFailure(err, 'live-flights');
  }
}
