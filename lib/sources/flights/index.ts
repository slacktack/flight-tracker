import { getCached, setCached } from '@/lib/redis-cache';
import type { FeedSource, LiveFeed, LiveFlight } from '@/types/flight';
import { fetchAdsb } from './adsb';
import { fetchFr24 } from './fr24';
import { fetchOpenSky } from './opensky';
import type { BBox } from './types';

export { parseBBox } from './types';
export type { BBox } from './types';

const LIVE_TTL_S = 8;
const SNAPSHOT_TTL_S = 6 * 3600;
const SOURCES: Array<[FeedSource, (b: BBox) => Promise<{ flights: LiveFlight[]; total: number | null }>]> = [
  ['fr24', fetchFr24],
  ['opensky', fetchOpenSky],
  ['adsb', fetchAdsb],
];

const keyFor = (b: BBox) => `flights:live:${b.lamin},${b.lomin},${b.lamax},${b.lomax}`;
const inflight = new Map<string, Promise<LiveFeed>>();

async function load(b: BBox): Promise<LiveFeed> {
  const key = keyFor(b);
  for (const [source, fetcher] of SOURCES) {
    try {
      const { flights, total } = await fetcher(b);
      const feed: LiveFeed = { count: flights.length, total, source, updatedAt: new Date().toISOString(), stale: false, flights };
      await setCached(key, feed, LIVE_TTL_S);
      await setCached(`${key}:last`, feed, SNAPSHOT_TTL_S);
      return feed;
    } catch (e) {
      console.warn(`[flights] ${source} failed:`, e instanceof Error ? e.message : e);
    }
  }
  const last = await getCached<LiveFeed>(`${key}:last`);
  if (last) return { ...last, stale: true };
  throw new Error('live flight feed unavailable');
}

// FR24 -> OpenSky -> adsb.lol, else the last good snapshot marked stale.
export async function getLiveFeed(b: BBox): Promise<LiveFeed> {
  const key = keyFor(b);
  const hit = await getCached<LiveFeed>(key);
  if (hit) return hit;
  const running = inflight.get(key);
  if (running) return running;
  const p = load(b).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
