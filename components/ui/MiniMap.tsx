'use client';

import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibregl } from '@/lib/maplibre';
import { altColorExpression, ROUTE } from '@/lib/altitude';
import { greatCircle } from '@/lib/geo';
import { useTheme, type Theme } from '@/lib/theme';
import { makeStyle, PALETTES } from '@/components/map/style';
import { planeImage } from '@/components/map/planeIcon';

export interface MiniDot {
  code: string;
  lon: number;
  lat: number;
  weight: number;
}
export interface MiniArc {
  a: [number, number];
  b: [number, number];
  weight: number;
}
export interface MiniPlane {
  lon: number;
  lat: number;
  hdg: number;
  alt: number;
  gnd: boolean;
}

interface Props {
  dots?: MiniDot[];
  arcs?: MiniArc[];
  planes?: MiniPlane[];
  center: [number, number];
  zoom: number;
  className?: string;
  label: string;
}

const fc = <G,>(features: G[]) => ({ type: 'FeatureCollection' as const, features });

// A quiet, non-interactive map for page heroes.
export function MiniMap({ dots = [], arcs = [], planes = [], center, zoom, className, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const { theme } = useTheme();
  const latest = useRef({ dots, arcs, planes, theme });
  latest.current = { dots, arcs, planes, theme };

  const sync = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const { dots, arcs, planes, theme } = latest.current;
    const maxW = Math.max(1, ...arcs.map((a) => a.weight));
    (m.getSource('arcs') as GeoJSONSource).setData(
      fc(arcs.map((a) => ({ type: 'Feature', properties: { w: a.weight / maxW }, geometry: { type: 'LineString', coordinates: greatCircle(a.a[1], a.a[0], a.b[1], a.b[0], 40) } }))),
    );
    const maxD = Math.max(1, ...dots.map((d) => d.weight));
    (m.getSource('dots') as GeoJSONSource).setData(fc(dots.map((d) => ({ type: 'Feature', properties: { code: d.code, w: d.weight / maxD }, geometry: { type: 'Point', coordinates: [d.lon, d.lat] } }))));
    (m.getSource('planes') as GeoJSONSource).setData(fc(planes.map((p) => ({ type: 'Feature', properties: { hdg: p.hdg, alt: p.alt, gnd: p.gnd ? 1 : 0 }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } }))));
    paint(m, theme);
  };

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: makeStyle(latest.current.theme),
      center,
      zoom,
      interactive: false,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.on('load', () => {
      m.addImage('plane', planeImage(64), { sdf: true, pixelRatio: 2 });
      m.addSource('arcs', { type: 'geojson', data: fc([]) });
      m.addSource('dots', { type: 'geojson', data: fc([]) });
      m.addSource('planes', { type: 'geojson', data: fc([]) });
      m.addLayer({ id: 'arcs', type: 'line', source: 'arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': ROUTE.dark, 'line-width': ['+', 1, ['*', 3, ['get', 'w']]], 'line-opacity': ['+', 0.25, ['*', 0.6, ['get', 'w']]] } });
      m.addLayer({ id: 'dot-glow', type: 'circle', source: 'dots', paint: { 'circle-radius': ['+', 6, ['*', 22, ['get', 'w']]], 'circle-color': '#5CE1E6', 'circle-opacity': 0.14, 'circle-blur': 0.6 } });
      m.addLayer({ id: 'dots', type: 'circle', source: 'dots', paint: { 'circle-radius': ['+', 2.5, ['*', 5, ['get', 'w']]], 'circle-color': '#5CE1E6', 'circle-stroke-color': '#0B1222', 'circle-stroke-width': 1.5 } });
      m.addLayer({
        id: 'planes',
        type: 'symbol',
        source: 'planes',
        layout: { 'icon-image': 'plane', 'icon-size': 0.5, 'icon-rotate': ['get', 'hdg'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true },
        paint: { 'icon-color': altColorExpression('dark') as unknown as string },
      });
      m.addLayer({
        id: 'dot-label',
        type: 'symbol',
        source: 'dots',
        layout: { 'text-field': ['get', 'code'], 'text-font': ['Montserrat Medium', 'Open Sans Bold'], 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-letter-spacing': 0.08 },
        paint: { 'text-color': '#C9D2E6', 'text-halo-color': '#0B1222', 'text-halo-width': 1.4 },
      });
      ready.current = true;
      sync();
    });
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(sync, [dots, arcs, planes, theme]);
  useEffect(() => {
    map.current?.easeTo({ center, zoom, duration: 600 });
  }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className} role="img" aria-label={label}>
      <div ref={el} className="h-full w-full" />
    </div>
  );
}

function paint(m: MlMap, theme: Theme) {
  const p = PALETTES[theme];
  for (const layer of m.getStyle().layers ?? []) {
    const src = makeStyle(theme).layers.find((l) => l.id === layer.id);
    if (src && 'paint' in src && src.paint) for (const [k, v] of Object.entries(src.paint)) m.setPaintProperty(layer.id, k as never, v as never);
  }
  const route = ROUTE[theme];
  const data = theme === 'dark' ? '#5CE1E6' : '#0891A0';
  m.setPaintProperty('arcs', 'line-color', route);
  m.setPaintProperty('dot-glow', 'circle-color', data);
  m.setPaintProperty('dots', 'circle-color', data);
  m.setPaintProperty('dots', 'circle-stroke-color', p.halo);
  m.setPaintProperty('dot-label', 'text-color', p.airportLabel);
  m.setPaintProperty('dot-label', 'text-halo-color', p.halo);
  m.setPaintProperty('planes', 'icon-color', altColorExpression(theme) as never);
}
