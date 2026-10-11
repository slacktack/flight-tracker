// One aircraft in the live feed, normalised across sources. Feet, knots, degrees, ft/min.
export interface LiveFlight {
  id: string;
  hex: string;
  // Commercial flight number, e.g. "AI101"; empty for most private/cargo traffic.
  fn: string;
  // ATC callsign, e.g. "AIC101".
  cs: string;
  lat: number;
  lon: number;
  alt: number;
  spd: number;
  hdg: number;
  vs: number;
  gnd: boolean;
  type: string;
  reg: string;
  org: string;
  dst: string;
  // Airline ICAO code, e.g. "AIC".
  al: string;
  sq: string;
  // Position time, epoch seconds.
  t: number;
}

export type FeedSource = 'fr24' | 'opensky' | 'adsb';

export interface LiveFeed {
  count: number;
  total: number | null;
  source: FeedSource;
  updatedAt: string;
  stale: boolean;
  flights: LiveFlight[];
}

export interface AirportRef {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface FlightDetail {
  route: {
    airline: { name: string; iata: string; icao: string } | null;
    origin: AirportRef | null;
    destination: AirportRef | null;
  } | null;
  aircraft: { model: string; manufacturer: string; owner: string; type: string; reg: string; country: string } | null;
  photo: { thumb: string; large: string; link: string; photographer: string } | null;
  // [lon, lat, altFt, epoch]
  trail: Array<[number, number, number, number]>;
}
