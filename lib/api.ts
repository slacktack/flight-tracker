import { NextResponse } from 'next/server';
import { getCached, setCached } from '@/lib/redis-cache';

export class UpstreamError extends Error {
  constructor(
    public provider: string,
    message: string,
    public status?: number,
  ) {
    super(`${provider}: ${message}`);
    this.name = 'UpstreamError';
  }
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchUpstream(provider: string, url: string, opts: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 12_000, ...init } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, cache: 'no-store', signal: controller.signal });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new UpstreamError(provider, aborted ? `timed out after ${timeoutMs}ms` : 'network error');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchUpstreamJson<T>(provider: string, url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetchUpstream(provider, url, opts);
  const text = await res.text();
  if (!res.ok) throw new UpstreamError(provider, `HTTP ${res.status}`, res.status);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new UpstreamError(provider, 'invalid JSON response', res.status);
  }
}

export const isAirportCode = (v: string | null): v is string => !!v && /^[A-Za-z]{3,4}$/.test(v);
export const isAirportOrCity = (v: string | null): v is string => !!v && /^~?[A-Za-z]{3,4}$/.test(v);
export const isFlightNo = (v: string | null): v is string => !!v && /^[A-Za-z]{2}\d{1,4}[A-Za-z]?$/.test(v);
export const isIsoDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

// "2026-10-10" -> "10-10-2026"
export function isoToDmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message, code: 'bad_request' }, { status: 400 });
}

export function upstreamFailure(err: unknown, label: string) {
  if (err instanceof UpstreamError) {
    const status = err.status === 404 ? 404 : 502;
    console.warn(`[${label}] ${err.message}`);
    return NextResponse.json({ error: err.message, provider: err.provider, code: status === 404 ? 'not_found' : 'upstream' }, { status });
  }
  console.error(`[${label}]`, err);
  return NextResponse.json({ error: 'Unexpected error', code: 'internal' }, { status: 500 });
}

export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const hit = await getCached<T>(key);
  if (hit) return hit;
  const value = await load();
  await setCached(key, value, ttlSeconds).catch(() => {});
  return value;
}
