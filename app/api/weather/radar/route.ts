import { NextResponse } from 'next/server';
import { upstreamFailure } from '@/lib/api';
import { getRadarFrame } from '@/lib/sources/weather';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ frame: await getRadarFrame() }, { headers: { 'Cache-Control': 'public, s-maxage=120' } });
  } catch (err) {
    return upstreamFailure(err, 'radar');
  }
}
