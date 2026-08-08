# STREET RACER '97

A browser-based, top-down arcade driving game on **real-world maps**, built
from scratch with zero dependencies — vanilla JavaScript (ES modules),
Canvas 2D, and browser-native APIs. Inspired by late-1990s top-down driving
games, played over real street networks.

## How to run

The game must be served over HTTP (ES modules do not work from `file://`).

```bash
node server.js            # serves on http://localhost:8080
node server.js 9000       # custom port
```

Open `http://localhost:8080` in Chrome / Edge / Firefox / Safari (desktop).

## How to play

| Input         | Action               |
| ------------- | -------------------- |
| W / ↑         | accelerate           |
| S / ↓         | brake / reverse      |
| A / ←, D / →  | steer                |
| Space         | handbrake            |
| Esc           | pause / resume       |
| F3            | debug overlay        |

**Mobile / touch**: the game auto-detects touch devices and shows
on-screen controls — ◀ ▶ steer (bottom-left), GAS / BRAKE / HB
(bottom-right), and a pause button (top-right). Multi-touch works via
pointer events, browser pinch/scroll gestures are locked out during
gameplay, and portrait phones get compact button sizing. Landscape is
recommended for the best view.

- Pick a preset city, type a place name, or enter coordinates like
  `38.7223,-9.1393`.
- The car spawns on the nearest real road to the chosen point.
- Driving off-road slows you down (reduced traction and acceleration).
- Leaving the loaded area shows a warning and gently pulls you back.

## Architecture

Three coordinate spaces, kept strictly separate:

1. **Geographic** — lat/lng, only at API boundaries.
2. **Local world** — meters relative to the spawn origin. All physics runs
   here. Derived from Web Mercator so OSM roads align exactly with tiles.
3. **Screen** — pixels; the camera converts world → screen.

```
index.html  styles.css
src/
  main.js                 entry point
  config/                 game + map provider tuning
  core/                   game state machine, fixed-timestep loop, input, camera
  geo/                    projection, tile math, geometry, geocoding
  map/                    tile provider interface, OSM/Google providers, tile manager/cache
  world/                  OSM road loading, road network, spatial index, world
  entities/               vehicle (arcade physics state)
  systems/                physics, road detection, spawn, bounds collision
  rendering/              canvas renderer, tile/vehicle/debug renderers
  ui/                     menu + HUD
  utils/                  logger, math helpers
test/                     node-runnable unit + headless integration tests
```

Key design decisions (per `specs.md`):

- **Fixed timestep physics** (60 Hz) with an accumulator; rendering
  interpolates between previous/current vehicle state, so behavior is
  frame-rate independent (30/60/120 Hz equivalent).
- **Tiles and geometry are separate systems.** Raster tiles are the visual
  layer; OSM road data (Overpass) is the gameplay geometry layer. The game
  never infers roads from imagery.
- **Provider abstraction**: a `TileProvider` interface with several free
  providers — OpenStreetMap (default), Esri Streets/Topo/Satellite, Carto
  Voyager/Dark/Light — all keyless and CORS-enabled. Stadia Maps (free
  key) and Google (billing account) are available once configured. Pick a
  provider in the menu's MAP TILES dropdown; geocoding via Nominatim
  (OSM), also isolated in one module.
- **Spatial index** (uniform grid, 100 m cells) so on-road detection never
  iterates all segments.
- **Debug mode (F3)** draws road centerlines + widths, the spatial grid,
  the nearest-road projection line, and a stats panel — essential for
  validating map/OSM alignment.

## Configuration

- `src/config/map-config.js` — tile provider registry keys, attribution,
  Overpass / Nominatim endpoints, road width table, optional Stadia key.
- `src/config/game-config.js` — physics tuning, zoom, cache size, camera.

## Map tile providers

| Provider | Cost | Key | Look |
| --- | --- | --- | --- |
| OpenStreetMap (default) | Free | No | Classic street map |
| Esri Streets | Free | No | Google-style labeled streets |
| Esri Topo | Free | No | Topographic hybrid |
| Esri Satellite | Free | No | Satellite imagery |
| Carto Voyager / Dark / Light | Free | No | Clean vector-style basemaps |
| Stadia Maps | Free tier | Yes (`stadiaApiKey`) | Smooth flat map |
| Google Maps | Paid | Yes (`googleApiKey`) | Google imagery |

All keyless providers are CORS-enabled, so the canvas stays untainted.
Esri serves tiles in z/y/x order — handled inside its provider class.
The player picks a provider in the menu each session; the default comes
from `MAP_CONFIG.provider`.

## Tests

```bash
node test/unit.mjs    # pure functions: projections, tiles, geometry, physics, LRU
node test/smoke.mjs   # headless boot: full game with stubbed DOM + mocked network
```

## Attribution & notes

- Map imagery and road data: **© OpenStreetMap contributors**
  ([tile usage policy](https://operations.osmfoundation.org/policies/tiles/),
  [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)).
  Attribution stays visible at all times.
- Avoid aggressive automated requests to public Overpass instances; loaded
  road regions are cached in memory.
- MVP scope per spec: no traffic, pedestrians, missions, police, weapons,
  or multiplayer. Mobile touch controls are out of scope.
