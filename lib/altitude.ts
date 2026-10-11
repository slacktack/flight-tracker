import type { Theme } from '@/lib/theme';

// Altitude bands. Night: dim and cool low, bright at cruise. Day: the same order, darkest at cruise.
const LABELS = ['Ground', 'Below 10,000 ft', '10,000–25,000 ft', '25,000–35,000 ft', 'Above 35,000 ft'] as const;
const LIMITS = [0, 10_000, 25_000, 35_000, Infinity] as const;
const COLORS: Record<Theme, readonly string[]> = {
  dark: ['#7E8AA8', '#5CE1E6', '#7FA6FF', '#C9B6FF', '#F5F1FF'],
  light: ['#8C96AD', '#0B9AA6', '#2F62D8', '#6A3FD0', '#141B33'],
};

export const ROUTE: Record<Theme, string> = { dark: '#FF4FD8', light: '#D6209C' };

export const bands = (theme: Theme) => LABELS.map((label, i) => ({ label, max: LIMITS[i], color: COLORS[theme][i] }));
export const ALT_BANDS = bands('dark');

export function altColor(altFt: number, onGround = false, theme: Theme = 'dark'): string {
  const c = COLORS[theme];
  if (onGround || altFt <= 0) return c[0];
  return c[LIMITS.findIndex((m) => altFt <= m)] ?? c[4];
}

// MapLibre colour expression on the `alt` / `gnd` feature properties.
export function altColorExpression(theme: Theme) {
  const c = COLORS[theme];
  return ['case', ['==', ['get', 'gnd'], 1], c[0], ['step', ['get', 'alt'], c[0], 1, c[1], 10_000, c[2], 25_000, c[3], 35_000, c[4]]];
}
