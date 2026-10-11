import { NextResponse } from 'next/server';
import { cached, upstreamFailure } from '@/lib/api';
import { allAirports } from '@/lib/sources/flights/airports';
import { getMetars } from '@/lib/sources/weather';

export const dynamic = 'force-dynamic';

// Flight category, temperature and wind for every airport we know, for map colouring.
export async function GET() {
  try {
    const list = allAirports().filter((a) => a.icao);
    const metars = await cached('metar:all', 900, () => getMetars(list.map((a) => a.icao!)));
    const byIcao = new Map(metars.map((m) => [m.icao, m]));
    const out: Record<string, { cat: string | null; temp: number | null; wind: number | null }> = {};
    for (const a of list) {
      const m = byIcao.get(a.icao!);
      if (m) out[a.code] = { cat: m.category, temp: m.tempC, wind: m.windKt };
    }
    return NextResponse.json({ airports: out }, { headers: { 'Cache-Control': 'public, s-maxage=600' } });
  } catch (err) {
    return upstreamFailure(err, 'weather-airports');
  }
}
