import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/api';
import { getFlightDetail } from '@/lib/sources/flights/detail';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const hex = (req.nextUrl.searchParams.get('hex') ?? '').toLowerCase();
  const cs = (req.nextUrl.searchParams.get('cs') ?? '').toUpperCase().replace(/\s+/g, '');
  if (!/^[0-9a-f]{6}$/.test(hex) && !/^[A-Z0-9]{3,8}$/.test(cs)) return badRequest('hex (6 hex chars) or cs (callsign) required');
  return NextResponse.json(await getFlightDetail(hex, cs));
}
