'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Siren, X } from 'lucide-react';
import { EMERGENCY, LiveMap, type LiveMapHandle, type MapBounds } from '@/components/map/LiveMap';
import { useLocal } from '@/lib/useLocal';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_LAYERS, LayersPanel, type Layers } from './LayersPanel';
import { RightNow } from './RightNow';
import { useLiveFeed } from '@/lib/useLiveFeed';
import { useFlightDetail } from '@/lib/useFlightDetail';
import { airlineName } from '@/lib/airlines';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { fmtAgo, fmtInt } from '@/lib/format';
import type { LiveFlight } from '@/types/flight';
import { FlightPanel } from './FlightPanel';
import { FilterPanel } from './FilterPanel';
import { MapControls } from './MapControls';
import { Omnibox } from './Omnibox';
import { activeCount, applyFilters, NO_FILTERS, type Filters } from './filters';
import { resolveRoute } from './route';
import { distanceKm } from '@/lib/geo';

const SOURCE = { fr24: 'Flightradar24', opensky: 'OpenSky', adsb: 'adsb.lol' } as const;

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function LiveScreen() {
  const router = useRouter();
  const mapRef = useRef<LiveMapHandle>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [follow, setFollow] = useState(false);
  const [layers, setLayers] = useLocal<Layers>('ft-layers', DEFAULT_LAYERS);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [panel, setPanel] = useState<'filters' | 'layers' | 'stats' | null>(null);
  const togglePanel = (p: 'filters' | 'layers' | 'stats') => setPanel((cur) => (cur === p ? null : p));
  const lastSeen = useRef<LiveFlight | null>(null);
  const [scrub, setScrub] = useState<[number, number, number, number] | null>(null);
  const now = useNow(5_000);
  const { theme } = useTheme();

  const feed = useLiveFeed(bounds);
  const radar = useQuery({
    queryKey: ['radar'],
    queryFn: async () => ((await (await fetch('/api/weather/radar')).json()) as { frame: { host: string; path: string } | null }).frame,
    enabled: layers.radar,
    refetchInterval: 300_000,
  });
  const airportWx = useQuery({
    queryKey: ['airport-wx'],
    queryFn: async () => ((await (await fetch('/api/weather/airports')).json()) as { airports: Record<string, { cat: string | null }> }).airports,
    enabled: layers.wx,
    staleTime: 600_000,
  });
  const wxCats = useMemo(() => Object.fromEntries(Object.entries(airportWx.data ?? {}).map(([k, v]) => [k, v.cat])), [airportWx.data]);
  const all = useMemo(() => feed.data?.flights ?? [], [feed.data]);
  const visible = useMemo(() => applyFilters(all, filters), [all, filters]);

  const live = selectedId ? all.find((f) => f.id === selectedId) ?? null : null;
  if (live) lastSeen.current = live;
  const selected = live ?? (selectedId && lastSeen.current?.id === selectedId ? lastSeen.current : null);
  const detail = useFlightDetail(selected);
  const route = useMemo(() => (selected ? resolveRoute(selected, detail.data) : null), [selected, detail.data]);
  // A trail that ends far from the plane belongs to an earlier flight.
  const trail = useMemo(() => {
    const t = detail.data?.trail ?? [];
    const last = t[t.length - 1];
    if (!selected || !last) return [];
    if (distanceKm(last[1], last[0], selected.lat, selected.lon) >= 150) return [];
    // OpenSky lags FR24 by a few minutes; join the trail to where the plane is now.
    return [...t, [selected.lon, selected.lat, selected.gnd ? 0 : selected.alt, Math.max(last[3] + 1, selected.t || Math.round(Date.now() / 1000))] as [number, number, number, number]];
  }, [detail.data, selected]);
  // Keep the selected plane drawn even when a filter would hide it.
  const drawn = useMemo(() => (selected && !visible.some((f) => f.id === selected.id) ? [...visible, selected] : visible), [visible, selected]);

  // Deep link: /?f=<id>&at=lat,lon
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const r = sp.get('route')?.toUpperCase().match(/^([A-Z]{3})-([A-Z]{3})$/);
    if (r) setFilters((cur) => ({ ...cur, route: { from: r[1], to: r[2] } }));
    const f = sp.get('f');
    const at = sp.get('at')?.split(',').map(Number);
    if (f) setSelectedId(f);
    if (at && at.length === 2 && at.every(Number.isFinite)) setTimeout(() => mapRef.current?.flyTo(at[1], at[0], 7), 300);
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setFollow(false);
    const url = new URL(location.href);
    if (id) url.searchParams.set('f', id);
    else {
      url.searchParams.delete('f');
      url.searchParams.delete('at');
    }
    history.replaceState(null, '', url);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.target instanceof HTMLInputElement) return;
      if (panel) setPanel(null);
      else select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panel, select]);

  const fitRoute = useCallback(() => {
    if (!selected) return;
    const pts: Array<[number, number]> = [[selected.lon, selected.lat]];
    for (const e of [route?.origin, route?.destination]) if (e?.lon != null && e.lat != null) pts.push([e.lon, e.lat]);
    const narrow = window.innerWidth < 768;
    mapRef.current?.fitPoints(pts, narrow ? { top: 120, bottom: window.innerHeight * 0.5, left: 40, right: 40 } : { top: 100, bottom: 80, left: 440, right: 100 });
  }, [selected, route]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (p) => mapRef.current?.flyTo(p.coords.longitude, p.coords.latitude, 8),
      () => {},
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  const updated = feed.data ? Date.parse(feed.data.updatedAt) : null;
  const stale = !!feed.data?.stale || (updated !== null && now - updated > 60_000);
  const airborne = visible.filter((f) => !f.gnd).length;
  const onGround = visible.length - airborne;
  const emergencies = all.filter((f) => EMERGENCY.has(f.sq));
  const SQK: Record<string, string> = { '7500': 'hijack code', '7600': 'radio failure', '7700': 'emergency' };
  const count = airborne || !onGround ? `${fmtInt(airborne)} in the air` : `${fmtInt(onGround)} on the ground`;

  return (
    <main className="fixed inset-0 overflow-hidden bg-night">
      <LiveMap
        ref={mapRef}
        flights={drawn}
        fetchedAt={feed.data?.fetchedAt ?? Date.now()}
        selectedId={selected?.id ?? null}
        trail={trail}
        routeAhead={route?.ahead ?? null}
        routeBehind={trail.length ? null : route?.behind ?? null}
        follow={follow}
        layers={{ ...layers, wx: !!layers.wx, radar: !!layers.radar }}
        radar={radar.data ?? null}
        airportWx={wxCats}
        scrub={scrub}
        theme={theme}
        onSelect={(id) => {
          select(id);
          const f = id ? all.find((x) => x.id === id) : null;
          if (f && window.innerWidth < 768) mapRef.current?.flyTo(f.lon, f.lat);
        }}
        onAirport={(code) => router.push(`/airport/${code}`)}
        onBounds={setBounds}
      />

      {/* top: search + status */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4 md:pt-4">
        <div className="pointer-events-auto mx-auto w-full max-w-[30rem] md:ml-[17.5rem] md:mr-auto lg:mx-auto">
          <Omnibox
            flights={all}
            onFlight={(f) => {
              select(f.id);
              mapRef.current?.flyTo(f.lon, f.lat, 7);
            }}
            onRoute={(from, to) => {
              setFilters({ ...filters, route: { from, to } });
              select(null);
            }}
            onAirport={(a) => mapRef.current?.flyTo(a.lon, a.lat, 8)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => togglePanel('stats')}
              aria-expanded={panel === 'stats'}
              aria-label="Right now in view"
              className={cn('glass flex h-8 items-center gap-2 rounded-full px-3 text-small shadow-float hover:text-ink', stale ? 'text-warn' : 'text-ink-2')}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', feed.isError && !feed.data ? 'bg-bad' : stale ? 'bg-warn' : 'bg-good')} aria-hidden />
              {feed.isError && !feed.data
                ? 'Live feed unreachable. Retrying.'
                : !feed.data
                  ? 'Finding flights…'
                  : `${count} · ${stale ? 'delayed, ' : ''}${updated ? fmtAgo(updated, now) : ''}`}
              {feed.data && <span className="hidden text-ink-3 sm:inline">· {SOURCE[feed.data.source]}</span>}
            </button>
            {emergencies.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  select(f.id);
                  mapRef.current?.flyTo(f.lon, f.lat, 8);
                }}
                className="flex h-8 items-center gap-1.5 rounded-full bg-[#FF4D4D] px-3 text-small font-semibold text-white shadow-float"
              >
                <Siren className="h-3.5 w-3.5" aria-hidden /> {f.fn || f.cs || f.reg} squawking {f.sq}, {SQK[f.sq]}
              </button>
            ))}
            {filters.route && (
              <button type="button" onClick={() => setFilters({ ...filters, route: null })} className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-small text-ink shadow-float">
                {filters.route.from} ⇄ {filters.route.to} <X className="h-3.5 w-3.5 text-ink-3" aria-label="Remove route filter" />
              </button>
            )}
            {filters.airline && (
              <button type="button" onClick={() => setFilters({ ...filters, airline: null })} className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-small text-ink shadow-float">
                {airlineName(filters.airline)} <X className="h-3.5 w-3.5 text-ink-3" aria-label="Remove airline filter" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* right: controls + filters */}
      <div className="absolute right-3 top-[calc(max(0.75rem,env(safe-area-inset-top))+6.5rem)] z-20 md:right-4 md:top-4">
        <MapControls
          onZoom={(d) => mapRef.current?.zoomBy(d)}
          onLocate={locate}
          layersOpen={panel === 'layers'}
          onLayers={() => togglePanel('layers')}
          filterCount={activeCount(filters)}
          filtersOpen={panel === 'filters'}
          onFilters={() => togglePanel('filters')}
        />
        {panel && (
          <div className="absolute right-[calc(100%+0.5rem)] top-0 origin-top-right animate-pop max-md:animate-rise max-md:fixed max-md:z-30 max-md:inset-x-3 max-md:right-3 max-md:top-auto max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]">
            {panel === 'filters' && <FilterPanel flights={all} filters={filters} onChange={setFilters} onClose={() => setPanel(null)} />}
            {panel === 'layers' && <LayersPanel layers={layers} onChange={setLayers} onClose={() => setPanel(null)} radarAvailable />}
            {panel === 'stats' && (
              <RightNow
                flights={visible}
                onClose={() => setPanel(null)}
                onFlight={(f) => {
                  setPanel(null);
                  select(f.id);
                  mapRef.current?.flyTo(f.lon, f.lat, 7);
                }}
                onRoute={(from, to) => {
                  setPanel(null);
                  setFilters({ ...filters, route: { from, to } });
                }}
              />
            )}
          </div>
        )}
      </div>

      {selected && (
        <FlightPanel
          key={selected.id}
          flight={selected}
          detail={detail.data}
          detailLoading={detail.isLoading}
          origin={route?.origin ?? null}
          destination={route?.destination ?? null}
          progress={route?.progress ?? null}
          follow={follow}
          onToggleFollow={() => {
            setFollow((v) => !v);
            if (!follow) mapRef.current?.flyTo(selected.lon, selected.lat);
          }}
          onFit={fitRoute}
          onClose={() => select(null)}
          lost={!live}
          trail={trail}
          onScrub={setScrub}
        />
      )}
    </main>
  );
}
