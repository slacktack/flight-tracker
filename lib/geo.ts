const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Points along the great circle from a to b, [lon, lat].
export function greatCircle(aLat: number, aLon: number, bLat: number, bLon: number, steps = 64): [number, number][] {
  const φ1 = rad(aLat), λ1 = rad(aLon), φ2 = rad(bLat), λ2 = rad(bLon);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [[aLon, aLat]];
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    out.push([deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))]);
  }
  return out;
}

// Dead reckoning: where a plane is after `sec` at speed (kt) and track.
export function project(lat: number, lon: number, trackDeg: number, speedKt: number, sec: number): [number, number] {
  const dist = (speedKt * 1.852 * sec) / 3600 / R_KM;
  const θ = rad(trackDeg);
  const φ1 = rad(lat);
  const λ1 = rad(lon);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(dist) + Math.cos(φ1) * Math.sin(dist) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(dist) * Math.cos(φ1), Math.cos(dist) - Math.sin(φ1) * Math.sin(φ2));
  return [deg(φ2), ((deg(λ2) + 540) % 360) - 180];
}
