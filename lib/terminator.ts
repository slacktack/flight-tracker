// The night side of the planet as a GeoJSON polygon, for a given moment.
const rad = Math.PI / 180;

function subsolar(date: Date): { lat: number; lon: number } {
  const jd = date.getTime() / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lon = ((ra / rad - gmst * 15 + 540) % 360) - 180;
  return { lat: dec / rad, lon };
}

export function nightPolygon(date = new Date()): GeoJSON.Feature<GeoJSON.Polygon> {
  const sun = subsolar(date);
  const dec = sun.lat * rad;
  const ring: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const ha = (lon - sun.lon) * rad;
    // Latitude where the sun sits on the horizon at this longitude.
    const lat = Math.atan(-Math.cos(ha) / Math.tan(dec || 1e-6)) / rad;
    ring.push([lon, lat]);
  }
  const pole = sun.lat > 0 ? -90 : 90;
  ring.push([180, pole], [-180, pole], ring[0]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
