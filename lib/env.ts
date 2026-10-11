export const env = {
  NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
};

export function assertServerEnv() {
  // Map tiles are key-free (CARTO); nothing required server-side.
}
