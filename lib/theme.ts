'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const KEY = 'ft-theme';

// Runs before paint (see layout) so the page never flashes the wrong theme.
export const themeBootScript = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&!matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

const resolve = (p: ThemePref): Theme => (p === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : p);

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>('system');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    let p: ThemePref = 'system';
    try {
      p = (localStorage.getItem(KEY) as ThemePref) || 'system';
    } catch {
      // storage blocked: follow the system
    }
    setPref(p);
    setTheme(resolve(p));
    const mq = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setPref((cur) => (cur === 'system' ? (setTheme(resolve('system')), cur) : cur));
    mq.addEventListener('change', onChange);
    const onSync = (e: Event) => {
      const next = (e as CustomEvent<ThemePref>).detail;
      setPref(next);
      setTheme(resolve(next));
    };
    window.addEventListener('ft-theme', onSync);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('ft-theme', onSync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1222' : '#EEF2F8');
  }, [theme]);

  const cycle = useCallback(() => {
    const order: ThemePref[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(pref) + 1) % order.length];
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // not persisted
    }
    window.dispatchEvent(new CustomEvent('ft-theme', { detail: next }));
  }, [pref]);

  return { pref, theme, cycle };
}
