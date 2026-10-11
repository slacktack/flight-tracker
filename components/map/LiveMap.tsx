'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { maplibregl } from '@/lib/maplibre';
import { altColor, altColorExpression, ROUTE } from '@/lib/altitude';
import type { Theme } from '@/lib/theme';
import { project } from '@/lib/geo';
import { nightPolygon } from '@/lib/terminator';
import airports from '@/data/airports.min.json';
import type { LiveFlight } from '@/types/flight';
import { basemapLayers, makeStyle, PALETTES } from './style';
import { planeImage } from './planeIcon';

export interface MapBounds {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
  zoom: number;
}

export interface LiveMapHandle {
  flyTo: (lon: number, lat: number, zoom?: number) => void;
  fitPoints: (pts: Array<[number, number]>, padding?: { top: number; bottom: number; left: number; right: number }) => void;
  zoomBy: (d: number) => void;
}

interface Props {
  flights: LiveFlight[];
  // When the feed rows were fetched, for dead reckoning.
  fetchedAt: number;
  selectedId: string | null;
  trail: Array<[number, number, number, number]>;
  routeAhead: Array<[number, number]> | null;
  routeBehind: Array<[number, number]> | null;
  follow: boolean;
  layers: { labels: boolean; night: boolean; airports: boolean; radar: boolean; wx: boolean };
  radar: { host: string; path: string } | null;
  airportWx: Record<string, string | null>;
  // A point picked on the altitude chart: [lon, lat, altFt, epoch]
  scrub: [number, number, number, number] | null;
  theme: Theme;
  onSelect: (id: string | null) => void;
  onAirport: (code: string) => void;
  onBounds: (b: MapBounds) => void;
}

// Recolours every layer in place, so switching theme never reloads tiles or drops our sources.
function applyTheme(m: MlMap, theme: Theme) {
  const p = PALETTES[theme];
  for (const layer of basemapLayers(p)) {
    if (!m.getLayer(layer.id) || !('paint' in layer) || !layer.paint) continue;
    for (const [k, v] of Object.entries(layer.paint)) m.setPaintProperty(layer.id, k as never, v as never);
  }
  const route = ROUTE[theme];
  m.setPaintProperty('airport-dot', 'circle-color', p.halo);
  m.setPaintProperty('airport-dot', 'circle-stroke-color', p.labelMid);
  m.setPaintProperty('airport-label', 'text-color', p.airportLabel);
  m.setPaintProperty('airport-label', 'text-halo-color', p.halo);
  m.setPaintProperty('behind', 'line-color', route);
  m.setPaintProperty('ahead', 'line-color', route);
  m.setPaintProperty('scrub', 'circle-stroke-color', route);
  m.setPaintProperty('flight-halo', 'circle-color', route);
  m.setPaintProperty('flight-halo', 'circle-stroke-color', route);
  m.setPaintProperty('flights', 'icon-color', ['case', ['==', ['get', 'sel'], 1], route, ['==', ['get', 'emg'], 1], EMERGENCY_COLOR, altColorExpression(theme)] as never);
  m.setPaintProperty('night', 'fill-color', theme === 'dark' ? '#000814' : '#1B2A4A');
  m.setPaintProperty('night', 'fill-opacity', theme === 'dark' ? 0.32 : 0.1);
  m.setPaintProperty('flights', 'icon-halo-color', p.planeHalo);
  m.setPaintProperty('flights-ground', 'icon-color', altColorExpression(theme) as never);
  m.setPaintProperty('flights-ground', 'icon-halo-color', p.planeHalo);
  m.setPaintProperty('flight-label', 'text-color', p.labelStrong);
  m.setPaintProperty('flight-label', 'text-halo-color', p.halo);
}

// 7500 hijack, 7600 radio failure, 7700 general emergency.
export const EMERGENCY = new Set(['7500', '7600', '7700']);
const EMERGENCY_COLOR = '#FF4D4D';

const EMPTY = { type: 'FeatureCollection' as const, features: [] };
const MAX_EXTRAPOLATE_S = 90;

function flightFeatures(flights: LiveFlight[], fetchedAt: number, selectedId: string | null) {
  const dt = Math.min(MAX_EXTRAPOLATE_S, Math.max(0, (Date.now() - fetchedAt) / 1000));
  return {
    type: 'FeatureCollection' as const,
    features: flights.map((f) => {
      const moving = !f.gnd && f.spd > 40;
      const [lat, lon] = moving ? project(f.lat, f.lon, f.hdg, f.spd, dt) : [f.lat, f.lon];
      return {
        type: 'Feature' as const,
        id: f.id,
        geometry: { type: 'Point' as const, coordinates: [lon, lat] },
        properties: { id: f.id, hdg: f.hdg, alt: f.alt, gnd: f.gnd ? 1 : 0, sel: f.id === selectedId ? 1 : 0, emg: EMERGENCY.has(f.sq) ? 1 : 0, label: f.fn || f.cs || f.reg, route: f.org && f.dst ? `${f.org} → ${f.dst}` : '', type: f.type },
      };
    }),
  };
}

function trailFeatures(trail: Props['trail'], theme: Theme) {
  const features = [];
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    features.push({
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [[a[0], a[1]], [b[0], b[1]]] },
      properties: { color: altColor(b[2], b[2] <= 0, theme) },
    });
  }
  return { type: 'FeatureCollection' as const, features };
}

const line = (coords: Array<[number, number]> | null) =>
  coords && coords.length > 1 ? { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: coords }, properties: {} } : EMPTY;

export const WX_COLORS: Record<string, string> = { VFR: '#22C55E', MVFR: '#3B82F6', IFR: '#EF4444', LIFR: '#D946EF' };

const airportFc = {
  type: 'FeatureCollection' as const,
  features: (airports as Array<{ code: string; name: string; lat: number; lon: number }>).map((a) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [a.lon, a.lat] },
    properties: { code: a.code, name: a.name },
  })),
};

export const LiveMap = forwardRef<LiveMapHandle, Props>(function LiveMap(props, ref) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const ready = useRef(false);
  const radarFrame = useRef<string | null>(null);
  const latest = useRef(props);
  latest.current = props;

  useImperativeHandle(ref, () => ({
    flyTo: (lon, lat, zoom) =>
      map.current?.flyTo({
        center: [lon, lat],
        zoom: zoom ?? Math.max(map.current.getZoom(), 7),
        duration: 900,
        essential: true,
        // On phones the flight sheet covers the lower half; aim above it.
        offset: window.innerWidth < 768 ? [0, -Math.round(window.innerHeight * 0.2)] : [0, 0],
      }),
    fitPoints: (pts, padding) => {
      const m = map.current;
      if (!m || pts.length === 0) return;
      const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
      for (const p of pts) b.extend(p);
      m.fitBounds(b, { padding: padding ?? 80, maxZoom: 9, duration: 900 });
    },
    zoomBy: (d) => map.current?.easeTo({ zoom: (map.current.getZoom() ?? 4) + d, duration: 300 }),
  }));

  useEffect(() => {
    if (!el.current) return;
    const narrow = window.innerWidth < 640;
    const m = new maplibregl.Map({
      container: el.current,
      style: makeStyle(latest.current.theme),
      center: [79, 22],
      zoom: narrow ? 3.6 : 4.4,
      minZoom: 2,
      maxZoom: 15,
      maxPitch: 0,
      dragRotate: false,
      attributionControl: { compact: true, customAttribution: 'Flights: Flightradar24 feed, OpenSky, adsb.lol' },
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;

    const emitBounds = () => {
      const b = m.getBounds();
      latest.current.onBounds({ lamin: b.getSouth(), lomin: b.getWest(), lamax: b.getNorth(), lomax: b.getEast(), zoom: m.getZoom() });
    };

    m.on('load', () => {
      m.addImage('plane', planeImage(64), { sdf: true, pixelRatio: 2 });
      m.addSource('night', { type: 'geojson', data: nightPolygon() });
      m.addLayer({ id: 'night', type: 'fill', source: 'night', paint: { 'fill-color': '#000814', 'fill-opacity': 0.28 } });
      radarFrame.current = null;
      m.addSource('airports', { type: 'geojson', data: airportFc });
      m.addSource('trail', { type: 'geojson', data: EMPTY });
      m.addSource('ahead', { type: 'geojson', data: EMPTY });
      m.addSource('behind', { type: 'geojson', data: EMPTY });
      m.addSource('flights', { type: 'geojson', data: EMPTY });
      m.addSource('scrub', { type: 'geojson', data: EMPTY });

      m.addLayer({ id: 'airport-dot', type: 'circle', source: 'airports', minzoom: 6, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.5, 9, 5], 'circle-color': '#0B1222', 'circle-stroke-color': '#7E8AA8', 'circle-stroke-width': 1.4 } });
      m.addLayer({
        id: 'airport-label',
        type: 'symbol',
        source: 'airports',
        minzoom: 7,
        layout: { 'text-field': ['get', 'code'], 'text-font': ['Montserrat Medium', 'Open Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13], 'text-offset': [0, 1], 'text-anchor': 'top', 'text-letter-spacing': 0.08 },
        paint: { 'text-color': '#A0ACC6', 'text-halo-color': '#0B1222', 'text-halo-width': 1.4 },
      });
      m.addLayer({ id: 'behind', type: 'line', source: 'behind', paint: { 'line-color': ROUTE.dark, 'line-opacity': 0.35, 'line-width': 1.5, 'line-dasharray': [1, 2] } });
      m.addLayer({ id: 'trail', type: 'line', source: 'trail', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 10, 3.5] } });
      m.addLayer({ id: 'ahead', type: 'line', source: 'ahead', layout: { 'line-cap': 'round' }, paint: { 'line-color': ROUTE.dark, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 10, 3], 'line-dasharray': [2, 1.5] } });
      m.addLayer({ id: 'scrub', type: 'circle', source: 'scrub', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': ROUTE.dark, 'circle-stroke-width': 3 } });
      m.addLayer({
        id: 'flight-halo',
        type: 'circle',
        source: 'flights',
        filter: ['==', ['get', 'sel'], 1],
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 14, 10, 22], 'circle-color': ROUTE.dark, 'circle-opacity': 0.18, 'circle-stroke-color': ROUTE.dark, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.8 },
      });
      m.addLayer({
        id: 'flight-emergency',
        type: 'circle',
        source: 'flights',
        filter: ['==', ['get', 'emg'], 1],
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 12, 10, 20], 'circle-color': EMERGENCY_COLOR, 'circle-opacity': 0.2, 'circle-stroke-color': EMERGENCY_COLOR, 'circle-stroke-width': 1.5 },
      });
      m.addLayer({
        id: 'flights-ground',
        type: 'symbol',
        source: 'flights',
        minzoom: 9,
        filter: ['all', ['==', ['get', 'gnd'], 1], ['==', ['get', 'sel'], 0]],
        layout: {
          'icon-image': 'plane',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.36, 6, 0.55, 10, 0.85, 14, 1.1],
          'icon-rotate': ['get', 'hdg'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['+', ['get', 'sel'], ['/', ['get', 'alt'], 100000]],
        },
        paint: {
          'icon-color': ['case', ['==', ['get', 'sel'], 1], ROUTE.dark, altColorExpression('dark') as unknown as string],
          'icon-halo-color': '#0B1222',
          'icon-halo-width': 1.2,
        },
      });
      m.addLayer({
        id: 'flights',
        type: 'symbol',
        source: 'flights',
        filter: ['any', ['==', ['get', 'gnd'], 0], ['==', ['get', 'sel'], 1]],
        layout: {
          'icon-image': 'plane',
          'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.42, 6, 0.6, 10, 0.85],
          'icon-rotate': ['get', 'hdg'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['+', ['get', 'sel'], ['/', ['get', 'alt'], 100000]],
        },
        paint: {
          'icon-color': ['case', ['==', ['get', 'sel'], 1], ROUTE.dark, altColorExpression('dark') as unknown as string],
          'icon-halo-color': '#0B1222',
          'icon-halo-width': 1.2,
        },
      });
      m.addLayer({
        id: 'flight-label',
        type: 'symbol',
        source: 'flights',
        minzoom: 7,
        filter: ['any', ['==', ['get', 'gnd'], 0], ['>=', ['zoom'], 11]],
        layout: { 'text-field': ['get', 'label'], 'text-font': ['Montserrat Medium', 'Open Sans Bold'], 'text-size': 10.5, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-optional': true },
        paint: { 'text-color': '#C9D2E6', 'text-halo-color': '#0B1222', 'text-halo-width': 1.4 },
      });

      const pick = (layer: string) => (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        if (layer === 'flights') latest.current.onSelect(String(f.properties?.id));
        else latest.current.onAirport(String(f.properties?.code));
      };
      m.on('click', 'flights', pick('flights'));
      m.on('click', 'flights-ground', pick('flights'));
      m.on('click', 'airport-dot', pick('airport'));
      m.on('click', (e) => {
        const hits = m.queryRenderedFeatures(e.point, { layers: ['flights', 'flights-ground', 'airport-dot'] });
        if (hits.length === 0) latest.current.onSelect(null);
      });
      // Desktop hover card: who it is before you click.
      const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 16, className: 'ft-tip', maxWidth: '240px' });
      const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
      for (const layer of ['flights', 'flights-ground']) {
        m.on('mousemove', layer, (e) => {
          const p = e.features?.[0]?.properties;
          if (!p || matchMedia('(pointer: coarse)').matches) return;
          const alt = Number(p.gnd) ? 'On the ground' : `${Math.round(Number(p.alt)).toLocaleString('en-IN')} ft`;
          tip
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${esc(p.label)}</strong>${p.route ? `<span>${esc(p.route)}</span>` : ''}<em>${esc([alt, p.type].filter(Boolean).join(' · '))}</em>`)
            .addTo(m);
        });
        m.on('mouseleave', layer, () => tip.remove());
      }
      for (const layer of ['flights', 'flights-ground', 'airport-dot']) {
        m.on('mouseenter', layer, () => (m.getCanvas().style.cursor = 'pointer'));
        m.on('mouseleave', layer, () => (m.getCanvas().style.cursor = ''));
      }
      ready.current = true;
      applyTheme(m, latest.current.theme);
      emitBounds();
      sync();
    });
    m.on('moveend', emitBounds);

    // Planes glide between polls; once a second is plenty for cruise speeds.
    const tick = setInterval(() => {
      if (!ready.current || document.hidden) return;
      const p = latest.current;
      (m.getSource('flights') as GeoJSONSource | undefined)?.setData(flightFeatures(p.flights, p.fetchedAt, p.selectedId));
      if (p.follow && p.selectedId) {
        const f = p.flights.find((x) => x.id === p.selectedId);
        if (f) {
          const dt = Math.min(MAX_EXTRAPOLATE_S, (Date.now() - p.fetchedAt) / 1000);
          const [lat, lon] = !f.gnd && f.spd > 40 ? project(f.lat, f.lon, f.hdg, f.spd, dt) : [f.lat, f.lon];
          m.easeTo({ center: [lon, lat], duration: 900, easing: (t) => t, offset: window.innerWidth < 768 ? [0, -Math.round(window.innerHeight * 0.2)] : [0, 0] });
        }
      }
    }, 1000);

    const nightTick = setInterval(() => (m.getSource('night') as GeoJSONSource | undefined)?.setData(nightPolygon()), 300_000);
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    return () => {
      clearInterval(tick);
      clearInterval(nightTick);
      ro.disconnect();
      m.remove();
      map.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    const m = map.current;
    if (!m || !ready.current) return;
    const p = latest.current;
    (m.getSource('flights') as GeoJSONSource).setData(flightFeatures(p.flights, p.fetchedAt, p.selectedId));
    (m.getSource('trail') as GeoJSONSource).setData(trailFeatures(p.trail, p.theme));
    (m.getSource('ahead') as GeoJSONSource).setData(line(p.routeAhead));
    (m.getSource('scrub') as GeoJSONSource).setData(p.scrub ? { type: 'Feature', geometry: { type: 'Point', coordinates: [p.scrub[0], p.scrub[1]] }, properties: {} } : EMPTY);
    (m.getSource('behind') as GeoJSONSource).setData(line(p.routeBehind));
    const vis = (on: boolean) => (on ? 'visible' : 'none');
    // Rain radar: swap the raster source whenever RainViewer publishes a new frame.
    const frame = p.radar ? `${p.radar.host}${p.radar.path}` : null;
    if (frame && frame !== radarFrame.current) {
      if (m.getLayer('radar')) m.removeLayer('radar');
      if (m.getSource('radar')) m.removeSource('radar');
      m.addSource('radar', { type: 'raster', tiles: [`${frame}/256/{z}/{x}/{y}/2/1_1.png`], tileSize: 256, maxzoom: 7, attribution: 'Radar: RainViewer' });
      m.addLayer({ id: 'radar', type: 'raster', source: 'radar', paint: { 'raster-opacity': 0.65, 'raster-fade-duration': 300 } }, 'airport-dot');
      radarFrame.current = frame;
    }
    if (m.getLayer('radar')) m.setLayoutProperty('radar', 'visibility', vis(p.layers.radar));
    const wxEntries = Object.entries(p.airportWx).filter(([, c]) => c && WX_COLORS[c]);
    m.setPaintProperty(
      'airport-dot',
      'circle-color',
      (p.layers.wx && wxEntries.length ? ['match', ['get', 'code'], ...wxEntries.flatMap(([code, c]) => [code, WX_COLORS[c!]]), PALETTES[p.theme].halo] : PALETTES[p.theme].halo) as never,
    );
    m.setLayoutProperty('flight-label', 'visibility', vis(p.layers.labels));
    m.setLayoutProperty('night', 'visibility', vis(p.layers.night));
    for (const id of ['airport-dot', 'airport-label']) m.setLayoutProperty(id, 'visibility', vis(p.layers.airports));
  };

  useEffect(sync, [props.flights, props.fetchedAt, props.selectedId, props.trail, props.routeAhead, props.routeBehind, props.layers, props.theme, props.radar, props.airportWx, props.scrub]);
  useEffect(() => {
    if (map.current && ready.current) applyTheme(map.current, props.theme);
  }, [props.theme]);

  // MapLibre forces position:relative on its container, so the sizing lives on a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={el} className="h-full w-full" role="application" aria-label="Live flight map. Use search to list flights by keyboard." />
    </div>
  );
});
