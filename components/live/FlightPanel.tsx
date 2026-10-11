'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, Check, Crosshair, Link2, Maximize2, Star, Ticket, X } from 'lucide-react';
import { useSaved } from '@/lib/saved';
import { cn } from '@/lib/cn';
import { airlineName } from '@/lib/airlines';
import { altColor, ROUTE } from '@/lib/altitude';
import { compass, fmtInt, fmtMinutes, ktToKmh } from '@/lib/format';
import { useTheme, type Theme } from '@/lib/theme';
import type { FlightDetail, LiveFlight } from '@/types/flight';
import type { Endpoint } from './route';

interface Props {
  flight: LiveFlight;
  detail: FlightDetail | undefined;
  detailLoading: boolean;
  origin: Endpoint | null;
  destination: Endpoint | null;
  progress: { flownKm: number; leftKm: number; pct: number; etaMin: number | null } | null;
  follow: boolean;
  onToggleFollow: () => void;
  onFit: () => void;
  onClose: () => void;
  lost: boolean;
}

function phase(f: LiveFlight): { text: string; cls: string } {
  if (f.gnd) return { text: f.spd > 30 ? 'Taxiing' : 'On the ground', cls: 'bg-ink/15 text-ink' };
  if (f.vs > 400) return { text: 'Climbing', cls: 'bg-data/20 text-data' };
  if (f.vs < -400) return { text: 'Descending', cls: 'bg-warn/20 text-warn' };
  return { text: 'Cruising', cls: 'bg-good/20 text-good' };
}

// Quadratic arc between the two airports; the plane sits at the flown fraction.
function RouteArc({ pct, theme }: { pct: number | null; theme: Theme }) {
  const P0 = [10, 62];
  const P1 = [150, 2];
  const P2 = [290, 62];
  const t = pct ?? 0;
  const pt = (k: number) => (1 - t) ** 2 * P0[k] + 2 * (1 - t) * t * P1[k] + t ** 2 * P2[k];
  const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
  const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const d = `M${P0} Q${P1} ${P2}`;
  const route = ROUTE[theme];
  return (
    <svg viewBox="0 0 300 70" className="h-auto w-full overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke="rgb(var(--ink-3))" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />
      {pct !== null && <path d={d} fill="none" stroke={route} strokeWidth="2.5" pathLength={1} strokeDasharray={`${t} 1`} strokeLinecap="round" />}
      <circle cx={P0[0]} cy={P0[1]} r="4.5" fill="rgb(var(--panel))" stroke={route} strokeWidth="2" />
      <circle cx={P2[0]} cy={P2[1]} r="4.5" fill="rgb(var(--panel))" stroke="rgb(var(--ink-3))" strokeWidth="2" />
      {pct !== null && t > 0.04 && t < 0.96 && (
        <g transform={`translate(${pt(0)} ${pt(1)}) rotate(${angle + 90})`}>
          <circle r="12" fill={route} opacity="0.16" />
          <path d="M0-9c1.2 0 1.6 1.6 1.6 3.4V-2l7.4 4.2v2L1.6 2.4V6l2.4 1.8v1.6L0 8.4l-4 1V7.8L-1.6 6V2.4L-9 4.2v-2L-1.6-2v-3.6C-1.6-7.4-1.2-9 0-9Z" fill={route} />
        </g>
      )}
    </svg>
  );
}

// Altitude over the flight so far, from the OpenSky trail.
function AltitudeProfile({ trail, theme }: { trail: FlightDetail['trail']; theme: Theme }) {
  const pts = useMemo(() => {
    if (trail.length < 4) return null;
    const step = Math.max(1, Math.floor(trail.length / 120));
    const s = trail.filter((_, i) => i % step === 0 || i === trail.length - 1);
    const t0 = s[0][3];
    const t1 = s[s.length - 1][3];
    const maxAlt = Math.max(10_000, ...s.map((p) => p[2]));
    return { line: s.map((p) => [((p[3] - t0) / Math.max(1, t1 - t0)) * 300, 54 - (p[2] / maxAlt) * 50] as const), maxAlt, minutes: (t1 - t0) / 60 };
  }, [trail]);
  if (!pts) return null;
  const route = ROUTE[theme];
  const d = pts.line.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts.line[pts.line.length - 1];
  return (
    <div>
      <div className="flex items-baseline justify-between text-small">
        <span className="font-medium text-ink-2">Altitude so far</span>
        <span className="text-ink-3">peak {fmtInt(pts.maxAlt)} ft · {fmtMinutes(pts.minutes)}</span>
      </div>
      <svg viewBox="0 0 300 58" preserveAspectRatio="none" className="mt-1.5 h-14 w-full" aria-hidden>
        <defs>
          <linearGradient id="altfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={route} stopOpacity="0.32" />
            <stop offset="1" stopColor={route} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L300 58 L0 58 Z`} fill="url(#altfill)" />
        <path d={d} fill="none" stroke={route} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <circle cx={last[0]} cy={last[1]} r="3" fill={route} />
      </svg>
    </div>
  );
}

function Instrument({ label, value, unit, sub, children }: { label: string; value: string; unit?: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="text-micro text-ink-3">{label}</p>
      <p className="mt-1 flex items-center gap-1 whitespace-nowrap font-cond text-title font-semibold leading-none text-ink">
        {children}
        {value}
        {unit && <span className="self-end text-small font-medium text-ink-3">{unit}</span>}
      </p>
      {sub && <p className="mt-1.5 truncate text-micro text-ink-3">{sub}</p>}
    </div>
  );
}

export function FlightPanel(props: Props) {
  const { flight: f, detail, origin, destination, progress } = props;
  const { theme } = useTheme();
  const { isSaved, toggle: toggleSaved } = useSaved();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const drag = useRef<number | null>(null);
  const ph = phase(f);
  const title = f.fn || f.cs || f.reg || f.hex.toUpperCase();
  const airline = detail?.route?.airline?.name || airlineName(f.al);
  const ac = detail?.aircraft;
  const photo = detail?.photo;
  const model = ac ? [ac.manufacturer, ac.model].filter(Boolean).join(' ') : '';

  const share = async () => {
    const url = `${location.origin}/?f=${encodeURIComponent(f.id)}&at=${f.lat.toFixed(2)},${f.lon.toFixed(2)}`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: `${title} live`, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // dismissed
    }
  };

  const onPointerDown = (e: React.PointerEvent) => (drag.current = e.clientY);
  const onPointerUp = (e: React.PointerEvent) => {
    if (drag.current === null) return;
    const dy = e.clientY - drag.current;
    drag.current = null;
    if (dy < -30) setExpanded(true);
    else if (dy > 60) {
      if (expanded) setExpanded(false);
      else props.onClose();
    } else if (Math.abs(dy) < 6) setExpanded((v) => !v);
  };

  const rows = (
    [
      ['Aircraft', model || f.type],
      ['Registration', f.reg || ac?.reg || ''],
      ['Operator', ac?.owner ? `${ac.owner}${ac.country ? `, ${ac.country}` : ''}` : ''],
      ['Callsign', f.cs && f.cs !== title ? f.cs : ''],
      ['Squawk', f.sq],
      ['Mode S', f.hex.toUpperCase()],
    ] as Array<[string, string]>
  ).filter((r) => !!r[1]);

  const where = !progress
    ? 'This flight hasn’t published its route.'
    : f.gnd && progress.flownKm < 15
      ? `At ${origin?.city || origin?.code}, ${fmtInt(progress.leftKm)} km from ${destination?.city || destination?.code}.`
      : f.gnd && progress.leftKm < 15
        ? `Landed at ${destination?.city || destination?.code}.`
        : null;

  return (
    <section
      aria-label={`Flight ${title}`}
      className={cn(
        'glass fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex flex-col overflow-hidden rounded-t-[22px] shadow-float',
        'md:bottom-4 md:left-4 md:right-auto md:top-[4.5rem] md:w-[380px] md:rounded-panel',
        expanded ? 'max-h-[80dvh]' : 'max-h-[52dvh] md:max-h-none',
      )}
    >
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        aria-label={expanded ? 'Show less' : 'Show more'}
        aria-expanded={expanded}
        className="absolute inset-x-0 top-0 z-10 flex h-6 touch-none items-center justify-center md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-ink-3/70" />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {photo && (
          <div className={cn('relative', !expanded && 'max-md:hidden')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.large} alt={`${model || f.type} ${f.reg}`} className="aspect-[16/10] w-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgb(var(--panel))] from-[8%] via-[rgb(var(--panel)/0.55)] via-[30%] to-transparent to-[60%]" />
            <a href={photo.link} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-micro text-white/85 backdrop-blur hover:text-white">
              © {photo.photographer}
            </a>
          </div>
        )}

        <div className={cn('relative px-4 pb-4 pt-6 md:pt-5', photo && 'md:-mt-14', photo && expanded && 'max-md:-mt-14')}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-cond text-code font-bold leading-none tracking-tight">{title}</h2>
              <p className="mt-1 truncate text-small text-ink-2">
                {airline || 'Operator unknown'}
                {f.type && <span className="text-ink-3"> · {f.type}</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className={cn('rounded-full px-2.5 py-1 text-micro font-semibold backdrop-blur', ph.cls)}>{ph.text}</span>
              {(f.fn || f.cs) && (
                <button
                  type="button"
                  onClick={() => toggleSaved(f, airline)}
                  aria-pressed={isSaved(f)}
                  aria-label={isSaved(f) ? `Remove ${title} from your flights` : `Save ${title} to your flights`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-ink/10 hover:text-ink"
                >
                  <Star className={cn('h-5 w-5 transition-transform active:scale-90', isSaved(f) && 'fill-warn text-warn')} aria-hidden />
                </button>
              )}
              <button type="button" onClick={props.onClose} aria-label="Close flight" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-ink/10 hover:text-ink">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          {props.lost && <p className="mt-3 rounded-control bg-warn/15 px-3 py-2 text-small text-warn">This flight left the area on screen, so its position may be old. Tap Follow to catch up.</p>}

          <div className="mt-4">
            <RouteArc pct={progress ? progress.pct : null} theme={theme} />
            <div className="-mt-1 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-cond text-title font-bold leading-none">{origin?.code || '—'}</p>
                <p className="mt-0.5 truncate text-small text-ink-2">{origin?.city || 'Unknown'}</p>
              </div>
              <div className="min-w-0 text-right">
                <p className="font-cond text-title font-bold leading-none">{destination?.code || '—'}</p>
                <p className="mt-0.5 truncate text-small text-ink-2">{destination?.city || 'Unknown'}</p>
              </div>
            </div>
            <p className="mt-3 text-small text-ink-2">
              {where ?? (
                <>
                  <span className="font-semibold text-ink">{fmtInt(progress!.leftKm)} km to go</span>
                  {progress!.etaMin !== null && <> · lands in about {fmtMinutes(progress!.etaMin)}</>}
                </>
              )}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line py-3">
            <Instrument
              label="Altitude"
              value={f.gnd ? 'Ground' : fmtInt(f.alt)}
              unit={f.gnd ? undefined : 'ft'}
              sub={f.gnd ? undefined : Math.abs(f.vs) > 100 ? `${f.vs > 0 ? '+' : '−'}${fmtInt(Math.abs(f.vs))} ft/min` : 'level'}
            >
              {!f.gnd && f.vs > 100 && <ArrowUp className="h-4 w-4 text-data" aria-label="climbing" />}
              {!f.gnd && f.vs < -100 && <ArrowDown className="h-4 w-4 text-warn" aria-label="descending" />}
              {(f.gnd || Math.abs(f.vs) <= 100) && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: altColor(f.alt, f.gnd, theme) }} aria-hidden />}
            </Instrument>
            <Instrument label="Speed" value={String(Math.round(f.spd))} unit="kt" sub={`${fmtInt(ktToKmh(f.spd))} km/h`} />
            <Instrument label="Heading" value={`${Math.round(f.hdg)}°`} sub={compass(f.hdg)}>
              <svg viewBox="-10 -10 20 20" className="h-4 w-4" aria-hidden>
                <circle r="9" fill="none" stroke="rgb(var(--ink-3))" strokeOpacity="0.6" strokeWidth="1.5" />
                <path d="M0-7 2.6 3 0 1.4-2.6 3Z" fill={ROUTE[theme]} transform={`rotate(${f.hdg})`} />
              </svg>
            </Instrument>
          </div>

          <div className={cn('space-y-5 pt-4', !expanded && 'max-md:hidden')}>
            {detail?.trail && <AltitudeProfile trail={detail.trail} theme={theme} />}
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-small">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
              {props.detailLoading && !ac && (
                <div className="contents">
                  <dt className="text-ink-3">Operator</dt>
                  <dd className="ml-auto h-3.5 w-28 animate-pulse rounded bg-line" />
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={props.onToggleFollow}
          aria-pressed={props.follow}
          className={cn(
            'flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-small font-semibold transition-colors',
            props.follow ? 'bg-route text-white' : 'border border-route/60 text-route hover:bg-route/10',
          )}
        >
          <Crosshair className="h-4 w-4" aria-hidden /> {props.follow ? 'Following' : 'Follow'}
        </button>
        <button type="button" onClick={props.onFit} aria-label="Show the whole route" title="Show the whole route" className="flex h-11 w-11 items-center justify-center rounded-control bg-panel-2 text-ink-2 hover:text-ink">
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={share} aria-label={copied ? 'Link copied' : 'Share flight'} title="Share flight" className="flex h-11 w-11 items-center justify-center rounded-control bg-panel-2 text-ink-2 hover:text-ink">
          {copied ? <Check className="h-4 w-4 text-good" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        </button>
        {origin?.code && destination?.code && (
          <Link href={`/fares?from=${origin.code}&to=${destination.code}`} className="flex h-11 items-center justify-center gap-2 rounded-control bg-panel-2 px-3 text-small font-semibold text-ink-2 hover:text-ink">
            <Ticket className="h-4 w-4" aria-hidden /> <span className="hidden xs:inline">Fares</span>
          </Link>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{copied ? 'Link copied' : ''}</span>
    </section>
  );
}
