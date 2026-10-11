'use client';

import { useLocal } from '@/lib/useLocal';
import type { LiveFlight } from '@/types/flight';

export interface SavedFlight {
  // Flight number when known, else callsign; flights keep these across days.
  key: string;
  airline: string;
  route: string;
}

export const savedKey = (f: LiveFlight) => f.fn || f.cs;

export function useSaved() {
  const [saved, setSaved] = useLocal<SavedFlight[]>('ft-saved', []);
  const isSaved = (f: LiveFlight) => saved.some((s) => s.key === savedKey(f));
  const toggle = (f: LiveFlight, airline: string) =>
    setSaved((cur) => {
      const k = savedKey(f);
      if (!k) return cur;
      return cur.some((s) => s.key === k) ? cur.filter((s) => s.key !== k) : [{ key: k, airline, route: f.org && f.dst ? `${f.org} to ${f.dst}` : '' }, ...cur].slice(0, 20);
    });
  const remove = (key: string) => setSaved((cur) => cur.filter((s) => s.key !== key));
  return { saved, isSaved, toggle, remove };
}
