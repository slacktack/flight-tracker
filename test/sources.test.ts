import { describe, expect, it } from 'vitest';
import { parseFr24 } from '@/lib/sources/flights/fr24';
import { parseOpenSky } from '@/lib/sources/flights/opensky';
import { parseBBox } from '@/lib/sources/flights/types';
import { parseTrack } from '@/lib/sources/flights/detail';
import { parseIndicative, toItinerary } from '@/lib/fares-provider';

describe('FR24 feed', () => {
  it('maps every column and skips metadata', () => {
    const { flights, total } = parseFr24({
      full_count: 19611,
      version: 4,
      '4212ff67': ['886289', 28.2, 77.8, 281, 38875, 434, '7700', 'F-X', 'A333', 'HS-XTI', 1791734693, 'DMK', 'ALA', 'XJ864', 0, 512, 'TAX864', 0, 'TAX'],
      stats: { total: {} },
    });
    expect(total).toBe(19611);
    expect(flights).toEqual([
      { id: '4212ff67', hex: '886289', fn: 'XJ864', cs: 'TAX864', lat: 28.2, lon: 77.8, alt: 38875, spd: 434, hdg: 281, vs: 512, gnd: false, type: 'A333', reg: 'HS-XTI', org: 'DMK', dst: 'ALA', al: 'TAX', sq: '7700', t: 1791734693 },
    ]);
  });
});

describe('OpenSky states', () => {
  it('converts metres and m/s to feet and knots', () => {
    const [f] = parseOpenSky([['abc123', 'AIC101 ', 'IN', 1, 2, 77, 28, 1000, false, 100, 90, 5, null, null, '1234', false, 0]]);
    expect(f.alt).toBe(3281);
    expect(f.spd).toBe(194);
    expect(f.vs).toBe(984);
    expect(f.al).toBe('AIC');
  });
});

describe('bbox', () => {
  it('snaps outward to 0.5° and rejects oversized or inverted boxes', () => {
    expect(parseBBox('8.2,68.3,35.7,95.1')).toEqual({ lamin: 8, lomin: 68, lamax: 36, lomax: 95.5 });
    expect(parseBBox('0,0,50,10')).toBeNull();
    expect(parseBBox('10,10,5,20')).toBeNull();
    expect(parseBBox('x')).toBeNull();
  });
});

describe('trail', () => {
  it('drops the previous flight before the last ground point and after a gap', () => {
    const t0 = 1_000_000;
    const path = [
      [t0, 28.5, 77.1, 10000, 0, false],
      [t0 + 60, 28.6, 77.2, 0, 0, true],
      [t0 + 120, 28.6, 77.2, 0, 0, true],
      [t0 + 180, 28.7, 77.3, 500, 0, false],
      [t0 + 240, 28.8, 77.4, 3000, 0, false],
    ];
    const trail = parseTrack(path);
    expect(trail.map((p) => p[3])).toEqual([t0 + 120, t0 + 180, t0 + 240]);
    const gapped = parseTrack([[t0, 1, 1, 100, 0, false], [t0 + 3600, 2, 2, 100, 0, false], [t0 + 3660, 3, 3, 100, 0, false]]);
    expect(gapped).toHaveLength(2);
  });
});

describe('fares', () => {
  it('keeps the cheapest price per day from nonstop/any keys', () => {
    expect(parseIndicative({ 'true_2026-10-31': 6000, 'false_2026-10-31': 5200, 'true_2026-11-01': 7000, junk: 1 })).toEqual([
      { date: '2026-10-31', price: 5200, nonstop: false },
      { date: '2026-11-01', price: 7000, nonstop: true },
    ]);
  });
  it('normalises legs and keeps one offer per site, cheapest first', () => {
    const dt = (h: number) => ({ year: 2026, month: 10, day: 28, hour: h, minute: 0, second: 0 });
    const it = toItinerary({
      id: 'x',
      bestPrice: 5601,
      currency: 'INR',
      legs: [{ carrier: { iata: 'SG', name: 'SpiceJet', imageUrl: 'l' }, origin: { iata: 'DEL', name: 'Delhi' }, destination: { iata: 'BOM', name: 'Mumbai' }, departureDateTime: dt(19), arrivalDateTime: dt(21), durationInMinutes: 130, stopCount: 0, segments: [{ flightNumber: 'SG  612', marketingCarrier: { iata: 'SG', name: 'SpiceJet' }, origin: { iata: 'DEL' }, destination: { iata: 'BOM' }, departureDateTime: dt(19), arrivalDateTime: dt(21), durationInMinutes: 130 }] }],
      pricingOptions: [
        { price: 5756, items: [{ price: 5756, deepLink: 'b', agent: { id: 'yatr', name: 'Yatra ', imageUrl: '' } }] },
        { price: 5601, items: [{ price: 5601, deepLink: 'a', agent: { id: 'goib', name: 'Goibibo', imageUrl: '' } }] },
        { price: 5900, items: [{ price: 5900, deepLink: 'c', agent: { id: 'goib', name: 'Goibibo', imageUrl: '' } }] },
      ],
    });
    expect(it.legs[0]).toMatchObject({ dep: '2026-10-28T19:00', arr: '2026-10-28T21:00', stops: 0 });
    expect(it.legs[0].segments[0].flightNumber).toBe('SG 612');
    expect(it.offers.map((o) => [o.agent.id, o.price])).toEqual([['goib', 5601], ['yatr', 5756]]);
    expect(it.offers[1].agent.name).toBe('Yatra');
  });
});
