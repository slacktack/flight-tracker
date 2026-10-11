# flight-tracker

Every flight over India, live. Tap a plane to see its route, progress, altitude and aircraft; open an airport for live arrivals and departures; compare fares across booking sites.

## Run locally

```bash
cp .env.example .env.local   # add the FARES_* values for fare search
npm install
npm run dev                  # http://localhost:3101
```

## Data

| What | Source |
|---|---|
| Live positions | Flightradar24 public feed (data-cloud), falling back to OpenSky, then adsb.lol |
| Route, airline, aircraft | adsbdb (hexdb as backup) |
| Trail | OpenSky tracks |
| Photos | Planespotters (credited) |
| Fares | Fare comparison provider (booking happens on partner sites) |
| Basemap | CARTO vector tiles, OpenStreetMap data |

## Env

| Variable | Purpose |
|---|---|
| `FARES_API_BASE`, `FARES_API_ORIGIN`, `FARES_EXT_ID`, `FARES_EXT_AUTH` | Fare search provider (server-only) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional shared cache; in-memory without them |
