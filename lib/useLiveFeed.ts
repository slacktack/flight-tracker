'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { LiveFeed } from '@/types/flight';

export interface Box {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

const MAX_LAT = 38; // below the API limit (40) to leave room for 0.5° snapping
const MAX_LON = 58;
const POLL_MS = 8_000;

// Pads the viewport so short pans keep planes on screen, then clamps to what the API accepts.
export function feedBox(b: Box): string {
  const padLat = (b.lamax - b.lamin) * 0.15;
  const padLon = (b.lomax - b.lomin) * 0.15;
  let lamin = b.lamin - padLat, lamax = b.lamax + padLat, lomin = b.lomin - padLon, lomax = b.lomax + padLon;
  const cLat = (lamin + lamax) / 2;
  const cLon = (lomin + lomax) / 2;
  if (lamax - lamin > MAX_LAT) [lamin, lamax] = [cLat - MAX_LAT / 2, cLat + MAX_LAT / 2];
  if (lomax - lomin > MAX_LON) [lomin, lomax] = [cLon - MAX_LON / 2, cLon + MAX_LON / 2];
  const r = (n: number, up: boolean) => (up ? Math.ceil(n * 2) : Math.floor(n * 2)) / 2;
  return [r(Math.max(-85, lamin), false), r(Math.max(-180, lomin), false), r(Math.min(85, lamax), true), r(Math.min(180, lomax), true)].join(',');
}

export function useLiveFeed(box: Box | null) {
  const key = box ? feedBox(box) : null;
  return useQuery({
    queryKey: ['live', key],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/live-flights?bbox=${key}`, { signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `Live feed failed (${res.status})`);
      return { ...(body as LiveFeed), fetchedAt: Date.now() };
    },
    enabled: !!key,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : POLL_MS),
    placeholderData: keepPreviousData,
    staleTime: 4_000,
  });
}
