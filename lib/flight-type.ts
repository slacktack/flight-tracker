// Shared flight-category → color/label helpers used by the map and cards.

export const FLIGHT_TYPE_COLORS: Record<string, string> = {
  WIDE: '#0A84FF',
  NARROW: '#34C759',
  REGIONAL: '#00C7BE',
  TURBO: '#5AC8FA',
  BIZ: '#AF52DE',
  CARGO: '#8E8E93',
  HELI: '#FF9F0A',
  JET: '#30D158',
};

const TYPE_LABELS: Record<string, string> = {
  WIDE: 'Wide-body',
  NARROW: 'Narrow-body',
  REGIONAL: 'Regional',
  TURBO: 'Turboprop',
  BIZ: 'Business jet',
  CARGO: 'Cargo',
  HELI: 'Helicopter',
  JET: 'Jet',
};

export function flightTypeColor(type: string): string {
  return FLIGHT_TYPE_COLORS[type] ?? '#30D158';
}

export function flightTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? 'Flight';
}

export function altBand(altFt: number | null): 'low' | 'cruise' | 'high' | 'ground' {
  if (altFt === null || altFt < 100) return 'ground';
  if (altFt < 10_000) return 'low';
  if (altFt < 30_000) return 'cruise';
  return 'high';
}
