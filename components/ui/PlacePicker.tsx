'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Place } from '@/types/booking';

interface Props {
  label: string;
  value: Place | null;
  onChange: (p: Place) => void;
  placeholder?: string;
  className?: string;
}

// Airport field: type a city, code or name; results from the local list and the fares provider.
export function PlacePicker({ label, value, onChange, placeholder, className }: Props) {
  const id = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState('');
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 180);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => setActive(0), [debounced]);
  useEffect(() => {
    const close = (e: PointerEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['places', debounced],
    queryFn: async ({ signal }) => (await (await fetch(`/api/places?q=${encodeURIComponent(debounced)}`, { signal })).json()) as { places: Place[] },
    enabled: open && debounced.length >= 1,
    staleTime: 3600_000,
  });
  const places = data?.places ?? [];

  const pick = (p: Place) => {
    onChange(p);
    setText('');
    setOpen(false);
  };

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <label htmlFor={id} className="block text-micro font-medium text-ink-3">
        {label}
      </label>
      <input
        id={id}
        value={open ? text : value ? `${value.city || value.name} (${value.iata})` : ''}
        placeholder={placeholder ?? 'City or airport'}
        onFocus={() => {
          setOpen(true);
          setText('');
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(places.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && places[active]) {
            e.preventDefault();
            pick(places[active]);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        role="combobox"
        aria-expanded={open && places.length > 0}
        aria-controls={`${id}-list`}
        autoComplete="off"
        className="mt-0.5 h-8 w-full truncate bg-transparent font-cond text-lead font-semibold text-ink outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-ink-3"
      />
      {open && debounced && (
        <ul id={`${id}-list`} role="listbox" className="glass absolute left-0 top-[calc(100%+10px)] z-50 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-panel py-1 shadow-float">
          {places.length === 0 && <li className="px-4 py-3 text-small text-ink-3">{isFetching ? 'Searching…' : 'No airport matches that. Try the city name or a 3-letter code.'}</li>}
          {places.map((p, i) => (
            <li
              key={p.iata}
              role="option"
              aria-selected={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(p)}
              className={cn('flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2', i === active && 'bg-panel-2')}
            >
              {p.type === 'airport' ? <Building2 className="h-4 w-4 shrink-0 text-ink-3" aria-hidden /> : <MapPin className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-medium">{p.city || p.name}</span>
                <span className="block truncate text-small text-ink-3">{p.name}{p.country ? `, ${p.country}` : ''}</span>
              </span>
              <span className="font-cond text-lead font-semibold text-ink-2">{p.iata}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
