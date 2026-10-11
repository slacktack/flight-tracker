import { NextResponse } from 'next/server';
import { badRequest, cached, upstreamFailure } from '@/lib/api';
import { getAirport } from '@/lib/sources/flights/airports';
import { getMetars, getTaf } from '@/lib/sources/weather';

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const a = getAirport(params.code.toUpperCase());
  if (!a?.icao) return badRequest('unknown airport');
  try {
    const [metar] = await cached(`metar:${a.icao}`, 600, () => getMetars([a.icao!]));
    const taf = await getTaf(a.icao).catch(() => '');
    return NextResponse.json({ icao: a.icao, metar: metar ?? null, taf }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
  } catch (err) {
    return upstreamFailure(err, 'weather');
  }
}
