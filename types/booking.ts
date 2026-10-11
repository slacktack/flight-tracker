// Fare comparison results, normalised. Deep links are partner hand-offs; never fetched server-side.

export interface Trip {
  source: string;
  destination: string;
  travelDate: string;
}

export type CabinClass = 'CABIN_CLASS_ECONOMY' | 'CABIN_CLASS_PREMIUM_ECONOMY' | 'CABIN_CLASS_BUSINESS' | 'CABIN_CLASS_FIRST';
export type SortBy = 'cheapest' | 'fastest' | 'best';

export interface CompareRequest {
  trips: Trip[];
  cabinClass: CabinClass;
  adults: number;
  currency: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface Carrier {
  iata: string;
  name: string;
  logo: string;
}

export interface Segment {
  flightNumber: string;
  carrier: Carrier;
  from: string;
  to: string;
  // Local airport time, "YYYY-MM-DDTHH:mm"
  dep: string;
  arr: string;
  minutes: number;
}

export interface Leg {
  carrier: Carrier;
  from: { iata: string; name: string };
  to: { iata: string; name: string };
  dep: string;
  arr: string;
  minutes: number;
  stops: number;
  stopCodes: string[];
  segments: Segment[];
}

export interface Offer {
  price: number;
  agent: { id: string; name: string; logo: string };
  deepLink: string;
}

export interface Itinerary {
  id: string;
  price: number;
  currency: string;
  legs: Leg[];
  offers: Offer[];
}

export interface CompareResponse {
  itineraries: Itinerary[];
  total: number;
  complete: boolean;
}

export interface Place {
  iata: string;
  name: string;
  city: string;
  country: string;
  type: 'airport' | 'city';
}

// date (YYYY-MM-DD) -> cheapest fare; nonstop when available.
export interface FareDay {
  date: string;
  price: number;
  nonstop: boolean;
}
