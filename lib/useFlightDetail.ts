'use client';

import { useQuery } from '@tanstack/react-query';
import type { FlightDetail, LiveFlight } from '@/types/flight';

export function useFlightDetail(f: Pick<LiveFlight, 'hex' | 'cs'> | null) {
  const hex = f?.hex ?? '';
  const cs = (f?.cs ?? '').replace(/\s+/g, '');
  return useQuery({
    queryKey: ['detail', hex, cs],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/flight/detail?hex=${hex}&cs=${cs}`, { signal });
      if (!res.ok) throw new Error('Flight details unavailable');
      return (await res.json()) as FlightDetail;
    },
    enabled: !!(hex || cs),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
