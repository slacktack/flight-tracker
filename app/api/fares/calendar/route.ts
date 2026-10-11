import { NextRequest, NextResponse } from 'next/server';
import { badRequest, cached, isIsoDate, upstreamFailure } from '@/lib/api';
import { fareCalendar } from '@/lib/fares-provider';

// Cheapest fare per day around a date: ?from=DEL&to=BOM&date=2026-10-28
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const from = (sp.get('from') ?? '').toUpperCase();
  const to = (sp.get('to') ?? '').toUpperCase();
  const date = sp.get('date');
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) return badRequest('from and to must be different 3-letter airport codes');
  if (!isIsoDate(date)) return badRequest('date must be YYYY-MM-DD');
  try {
    const days = await cached(`fares-cal:${from}:${to}:${date}`, 600, () => fareCalendar({ source: from, destination: to, travelDate: date }, 'INR'));
    return NextResponse.json({ days });
  } catch (err) {
    return upstreamFailure(err, 'fares-calendar');
  }
}
