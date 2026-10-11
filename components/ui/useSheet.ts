'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';

type Snap = 'peek' | 'full';

const FULL_VH = 0.8;
// Mobile tab bar height; the sheet sits on top of it.
export const NAV_PX = 64;
const EASE = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)';

// Phone bottom sheet: follows the finger, snaps by position and flick speed,
// pulls down from the top of its content to collapse. Desktop gets no styles.
export function useSheet(onClose: () => void) {
  const sheetRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const peekEndRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);
  const [snap, setSnap] = useState<Snap>('peek');
  const [fullH, setFullH] = useState(0);
  const [peekH, setPeekH] = useState(320);
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ y: number; t: number; dy: number; fromContent: boolean } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const snapRef = useRef(snap);
  snapRef.current = snap;

  useEffect(() => {
    const mq = matchMedia('(max-width: 767px)');
    const update = () => {
      setMobile(mq.matches);
      setFullH(Math.round(window.innerHeight * FULL_VH - NAV_PX));
    };
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update);
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Peek shows everything down to the marker element.
  useLayoutEffect(() => {
    if (!mobile || !sheetRef.current || !peekEndRef.current) return;
    const measure = () => {
      const top = sheetRef.current!.getBoundingClientRect().top;
      const end = peekEndRef.current!.getBoundingClientRect().bottom;
      setPeekH(Math.min(fullH, Math.max(200, Math.round(end - top + 14))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(peekEndRef.current);
    return () => ro.disconnect();
  }, [mobile, fullH]);

  const base = snap === 'full' ? 0 : Math.max(0, fullH - peekH);

  const resolve = useCallback(
    (dy: number, dt: number) => {
      const v = dy / Math.max(1, dt); // px per ms
      if (snapRef.current === 'peek') {
        if (dy < -50 || v < -0.45) setSnap('full');
        else if (dy > 70 || v > 0.55) closeRef.current();
      } else if (dy > 90 || v > 0.5) {
        setSnap('peek');
        scrollRef.current?.scrollTo({ top: 0 });
      }
      setDrag(null);
    },
    [],
  );

  const clamp = (dy: number) => {
    const b = snapRef.current === 'full' ? 0 : Math.max(0, fullH - peekH);
    // Rubber-band past the top; free movement downwards.
    const next = b + dy;
    return next < 0 ? -Math.sqrt(-next) * 4 - b : dy;
  };

  // Header / handle: pointer events with capture, works for mouse and touch.
  const handle = {
    onPointerDown: (e: RPointerEvent) => {
      if (!mobile || (e.target as HTMLElement).closest('button:not([data-sheet-handle]),a')) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      gesture.current = { y: e.clientY, t: performance.now(), dy: 0, fromContent: false };
    },
    onPointerMove: (e: RPointerEvent) => {
      const g = gesture.current;
      if (!g || g.fromContent) return;
      g.dy = e.clientY - g.y;
      if (Math.abs(g.dy) > 3) setDrag(clamp(g.dy));
    },
    onPointerUp: (e: RPointerEvent) => {
      const g = gesture.current;
      gesture.current = null;
      if (!g || g.fromContent) return;
      const dt = performance.now() - g.t;
      // A tap on the handle toggles.
      if (Math.abs(g.dy) < 6 && dt < 300 && (e.target as HTMLElement).closest('[data-sheet-handle]')) {
        setSnap((s) => (s === 'full' ? 'peek' : 'full'));
        setDrag(null);
        return;
      }
      resolve(g.dy, dt);
    },
    onPointerCancel: () => {
      gesture.current = null;
      setDrag(null);
    },
  };

  // Content: drags the sheet in peek, and when pulled down from the top while expanded.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !mobile) return;
    let startY = 0;
    let startT = 0;
    let owning = false;
    let ignore = false;
    const onStart = (e: TouchEvent) => {
      ignore = !!(e.target as HTMLElement).closest('[data-sheet-ignore]');
      startY = e.touches[0].clientY;
      startT = performance.now();
      owning = false;
    };
    const onMove = (e: TouchEvent) => {
      if (ignore) return;
      const dy = e.touches[0].clientY - startY;
      const full = snapRef.current === 'full';
      if (!owning) {
        if (Math.abs(dy) < 6) return;
        owning = !full || (el.scrollTop <= 0 && dy > 0);
        if (!owning) return;
        startY = e.touches[0].clientY - dy;
      }
      e.preventDefault();
      gesture.current = { y: startY, t: startT, dy, fromContent: true };
      setDrag(clamp(dy));
    };
    const onEnd = () => {
      if (owning && gesture.current?.fromContent) resolve(gesture.current.dy, performance.now() - startT);
      gesture.current = null;
      owning = false;
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobile, fullH, peekH, resolve]);

  const style: CSSProperties | undefined = mobile
    ? {
        height: fullH || undefined,
        transform: `translate3d(0, ${base + (drag ?? 0)}px, 0)`,
        transition: drag === null ? EASE : 'none',
        willChange: 'transform',
      }
    : undefined;

  return { sheetRef, scrollRef, peekEndRef, mobile, snap, setSnap, style, handle, full: !mobile || snap === 'full' };
}
