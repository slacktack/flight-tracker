'use client';

import { useCallback, useEffect, useState } from 'react';

// State mirrored to localStorage; falls back to memory when storage is blocked.
export function useLocal<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // keep the default
    }
    const onSync = (e: StorageEvent) => e.key === key && e.newValue && setValue(JSON.parse(e.newValue) as T);
    window.addEventListener('storage', onSync);
    return () => window.removeEventListener('storage', onSync);
  }, [key]);
  const set = useCallback(
    (next: T | ((cur: T) => T)) =>
      setValue((cur) => {
        const v = typeof next === 'function' ? (next as (c: T) => T)(cur) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {
          // not persisted
        }
        return v;
      }),
    [key],
  );
  return [value, set] as const;
}
