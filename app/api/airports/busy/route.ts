import { NextResponse } from 'next/server';
import { upstreamFailure } from '@/lib/api';
import { getLiveFeed } from '@/lib/sources/flights';
import { getAirport } from '@/lib/sources/flights/airports';

export const dynamic = 'force-dynamic';

// Busiest Indian airports right now, by aircraft in the air heading to or from them.
export async function GET() {
  try {
    const feed = await getLiveFeed({ lamin: 5, lomin: 62, lamax: 38, lomax: 100 });
    const tally = new Map<string, { inbound: number; outbound: number }>();
    for (const f of feed.flights) {
      if (f.gnd) continue;
      for (const [code, k] of [[f.dst, 'inbound'], [f.org, 'outbound']] as const) {
        if (!code || !getAirport(code)) continue;
        const t = tally.get(code) ?? { inbound: 0, outbound: 0 };
        t[k] += 1;
        tally.set(code, t);
      }
    }
    const routes = new Map<string, number>();
    for (const f of feed.flights) {
      if (f.gnd || !f.org || !f.dst) continue;
      const a = getAirport(f.org);
      const b = getAirport(f.dst);
      if (a?.country !== 'India' || b?.country !== 'India') continue;
      const k = [f.org, f.dst].sort().join('-');
      routes.set(k, (routes.get(k) ?? 0) + 1);
    }
    const topRoutes = Array.from(routes.entries())
      .sort((x, y) => y[1] - x[1])
      .slice(0, 14)
      .map(([k, n]) => {
        const [a, b] = k.split('-').map((c) => getAirport(c)!);
        return { from: a.code, to: b.code, n, a: [a.lon, a.lat], b: [b.lon, b.lat] };
      });
    const airports = Array.from(tally.entries())
      .map(([code, t]) => ({ ...getAirport(code)!, ...t, total: t.inbound + t.outbound }))
      .filter((a) => a.country === 'India')
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
    return NextResponse.json({ airports, routes: topRoutes, updatedAt: feed.updatedAt }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
  } catch (err) {
    return upstreamFailure(err, 'airports-busy');
  }
}
