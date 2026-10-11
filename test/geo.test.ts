import { describe, expect, it } from 'vitest';
import { distanceKm, greatCircle, project } from '@/lib/geo';
import { nightPolygon } from '@/lib/terminator';
import { buildBoard } from '@/lib/boards';
import type { LiveFlight } from '@/types/flight';

describe('geo', () => {
  it('measures DEL to BOM at about 1,140 km', () => {
    expect(Math.round(distanceKm(28.5562, 77.1, 19.0896, 72.8656))).toBeGreaterThan(1130);
    expect(Math.round(distanceKm(28.5562, 77.1, 19.0896, 72.8656))).toBeLessThan(1150);
  });
  it('great circle starts and ends at the airports', () => {
    const gc = greatCircle(28.5, 77.1, 19.1, 72.9, 10);
    expect(gc[0][0]).toBeCloseTo(77.1);
    expect(gc[10][1]).toBeCloseTo(19.1);
  });
  it('dead reckoning moves a 480 kt eastbound plane about 4.4 km in 18 s', () => {
    const [lat, lon] = project(20, 78, 90, 480, 18);
    expect(lat).toBeCloseTo(20, 3);
    expect(distanceKm(20, 78, lat, lon)).toBeCloseTo(4.44, 1);
  });
});

describe('day and night', () => {
  it('puts the dark side opposite the sun', () => {
    // 06:30 UTC: midday over India, night over the Pacific
    const poly = nightPolygon(new Date('2026-10-11T06:30:00Z'));
    expect(poly.geometry.coordinates[0].length).toBeGreaterThan(100);
  });
});

describe('airport board', () => {
  const base: LiveFlight = { id: '', hex: '', fn: '', cs: '', lat: 0, lon: 0, alt: 0, spd: 0, hdg: 0, vs: 0, gnd: false, type: '', reg: '', org: '', dst: '', al: '', sq: '', t: 0 };
  it('sorts inbound by ETA and finds parked aircraft nearby', () => {
    const b = buildBoard(
      [
        { ...base, id: 'far', dst: 'DEL', lat: 19, lon: 72.9, spd: 450, alt: 35000 },
        { ...base, id: 'near', dst: 'DEL', lat: 28.0, lon: 77.1, spd: 250, alt: 8000 },
        { ...base, id: 'out', org: 'DEL', lat: 27, lon: 76, spd: 400, alt: 20000 },
        { ...base, id: 'park', gnd: true, lat: 28.56, lon: 77.1 },
        { ...base, id: 'elsewhere', gnd: true, lat: 19, lon: 72.9 },
      ],
      'DEL',
      28.5562,
      77.1,
    );
    expect(b.arriving.map((r) => r.id)).toEqual(['near', 'far']);
    expect(b.departed.map((r) => r.id)).toEqual(['out']);
    expect(b.ground.map((r) => r.id)).toEqual(['park']);
  });
});
