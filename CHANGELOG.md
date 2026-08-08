# Changelog — STREET RACER '97

## `2c6dad0` — Street Racer '97: top-down arcade driving on real-world maps

Initial MVP (Milestones 1–7 from `specs.md`), zero dependencies.

**45 files · 5,182 lines**

| Area | What |
|---|---|
| Project skeleton | `index.html`, `styles.css`, `server.js`, `src/main.js` |
| Config | `game-config.js` (physics, zoom, spawn), `map-config.js` (tiles, attribution, road types) |
| Geo | Mercator projection, coordinate systems (lat/lng ↔ local meters ↔ tiles), geometry (point-to-segment distance, projection, bounding box), Nominatim geocoder with raw-coordinate parsing |
| Map | `TileProvider` interface → `OsmTileProvider` + `GoogleTileProvider` (stub); LRU tile cache (200 tiles); tile manager with async loading (`createImageBitmap` + CORS), overscan, fallback background |
| World | Overpass road loading (query builder, normalization, width estimation, access-tag filtering); region cache; road network in local meters; spatial grid index (100 m cells); spawn on nearest road |
| Entities | `Vehicle` (arcade physics state), `PlayerCar` (keyboard → signals) |
| Systems | Fixed-60Hz physics (acceleration, braking, rolling resistance, aero drag, speed-dependent steering, off-road multipliers, handbrake); road detection; spawn; soft world-bounds guard |
| Rendering | Canvas 2D with DPR scaling; draw order: tiles → debug roads → player vehicle; procedural retro car (shadow, body, windshield, indicators); OSM road centerlines + grid debug overlay (F3) |
| UI | Location menu (presets Lisbon/São Paulo/Tokyo/New York, place search, coordinate input, loading/error states); DOM HUD (km/h speed, coords, debug panel) |
| Core | State machine (BOOT→MENU→LOADING→PLAYING→PAUSED→ERROR); fixed-timestep game loop with accumulator + render interpolation; camera (smooth follow, velocity look-ahead); input (keyboard capture, prevent scroll/zoom); event bus |
| Retro visuals | Scanline overlay, monospace font, hard shadows, neon palette, pixelated canvas rendering |
| Tests | 63 unit tests (projections, tile math, segment geometry, physics, spatial index, spawn, camera, cache LRU, frame independence); 20 headless smoke tests (full boot, spawn, drive, pause, error, location switch); live Overpass + tile CORS verified via curl |

---

## `6aba2cd` — Add free tile providers: Esri, Carto (keyless) + Stadia (free key)

**13 files · +246 / −24 lines**

- **Provider registry** (`provider-registry.js`): 8 providers mapped by id → factory + label. Used by the menu dropdown and `Game.createTileProvider()`.
- **3 new providers**:
  - `EsriTileProvider` — streets, topo, satellite layers. Free, keyless, CORS. Uses **z/y/x** tile order (not the standard z/x/y).
  - `CartoTileProvider` — voyager, dark_all, light_all styles. Free, keyless, CORS.
  - `StadiaTileProvider` — alidade_smooth style. Needs a free API key from cloud.stadiamaps.com. Hidden from the menu until `stadiaApiKey` is configured.
- **Menu dropdown:** select element populated from `getProviderOptions()`, defaults to `MAP_CONFIG.provider`.
- **Config:** `stadiaApiKey` field, attribution strings for Esri / Carto / Stadia.
- **Tile loader robustness:** plain `<img>` fallback for providers without CORS headers.
- **Tests:** 4 new unit checks (Esri z/y/x URL format, Carto URL, registry default, registry attribution).

---

## `4a17859` — Add mobile touch controls

**8 files · +294 / −5 lines**

- **`Input` virtual state:** `setVirtual(action, pressed)` merges touch buttons with keyboard; `clear()` resets both.
- **`TouchControls`:** auto-detects `(pointer: coarse)` or `ontouchstart`; shows on-screen buttons only during gameplay.
- **Button layout:** ◀ ▶ steer (bottom-left), GAS (bottom-right, green), BRAKE (red), HB (yellow), ❚❚ pause (top-right).
- **`touch-action: none`** on `html`/`body`/`canvas`; `overscroll-behavior: none`; long-press disabled on the canvas.
- **Portrait sizing:** compact button sizes via `@media (max-width: 520px)`.
- **Debug panel repositioned** on coarse-pointer devices (`top: 64px` to avoid the steering buttons).
- **Tests:** 3 new unit checks (virtual accelerate, release, clear); 2 smoke checks (buttons wired, hidden on desktop).

---

## `4a589e4` — Asphalt-style TouchDrive controls

**15 files · +320 / −119 lines**

- **Road-following auto-drive** (`AutoDriveSystem`): steers toward the best-aligned road segment ahead via `RoadNetwork.bestRoadAhead()` (prefers segments aligned with travel direction over closer side streets). Steering = proportional to heading error.
- **AUTO/MANUAL toggle:** button (top-right) and `Y` key. `PlayerCar.interpretInput()` blends assist: `steer = manual + assist × (1 − |manual|) × strength`. Manual wins while actively steering.
- **Touch-anywhere steering zone:** replaces the ◀/▶ buttons with a full-screen `<div id="steer-zone">`. Touch = gas; drag = steer proportionally to finger position (position-based virtual wheel).
- **Continuous steering:** `input.state.steer` (range −1..1) replaces boolean left/right. Keyboard maps to ±1; touch is proportional.
- **Shared helpers:** `angleDiff()` in `utils/math.js`; `segmentHeading()` in `road-segment.js` (reused by AutoDrive + Spawn).
- **Config:** `autoDriveGain: 2.6`, `autoDriveStrength: 0.65`, `autoDriveRadius: 45`.
- **Tests:** 5 unit checks (setSteer, assist aligned = 0, assist misaligned steers, blend idle, manual wins); 6 smoke checks (buttons count 4, steer zone bound, steer input, assist toggle + label, car turned). **Live road-following verification:** car autonomously drove 449 m along a street grid in 12 s at full speed, staying 0.00 m off the centerline.

---

## `cb78f2b` — Fix mobile touch driving + landscape default

**7 files · +299 / −67 lines**

- **Dual event binding:** feature-detects `window.PointerEvent`; modern browsers use pointer events, legacy (in-app WebViews) use touch events. Only one path active.
- **Removed `pointerleave` from release:** iOS Safari fires it right after `pointerdown` on touch, cancelling the press instantly.
- **Runtime touch activation:** `window.addEventListener("touchstart", once)` — if static detection missed the device, the first real touch anywhere activates the UI.
- **Safety guards:** `window.blur` and `document.visibilitychange` → `endSteer()` (never leave acceleration stuck).
- **Landscape default:**
  - Tap PLAY → `requestFullscreen()` + `screen.orientation.lock("landscape")` (Android Chrome).
  - Rotate overlay (animated icon + "ROTATE YOUR DEVICE") on portrait phones during gameplay, with a "CONTINUE ANYWAY" dismiss.
- **Viewport meta:** `maximum-scale=1.0, user-scalable=no, viewport-fit=cover`.
- **Detection robustness:** `navigator.maxTouchPoints > 0` added alongside coarse-pointer + ontouchstart checks.
- **Tests:** 1 new smoke check (rotate overlay hidden on desktop). **Legacy touch path verified:** simulated browser without PointerEvent — touchstart → accelerate true, steer proportional ±0.89, touchend → release.

---

## `8cd48b1` — Bulletproof touch steering + live diagnostics

**4 files · +37 / −12 lines**

- **Event delegation on `#game`:** steering no longer bound to the `#steer-zone` div — any touch anywhere on the game area (canvas, map, empty space) starts driving. Buttons are excluded via `target.closest("button")`. Removes all dependence on element hit-testing, z-index, or stacking context.
- **Reverted `isUiButton` check** from `target instanceof Element` (bare `Element` global not guaranteed in all module environments) to `typeof target.closest === "function"`.
- **Live input diagnostics:** HUD debug panel (F3) now shows `INPUT acc=1 brk=0 steer=0.89` — real-time touch feedback.
- **Remote debugging:** `window.__game` exposed in `main.js` (inspect game state from `chrome://inspect`).
- **Defensive construction:** `TouchControls` wrapped in try/catch so a failure never bricks the boot.
- **New jsdom E2E suite** (`~/tools/e2e/e2e.mjs`): loads the real `index.html` DOM, real modules, dispatches real `PointerEvent`s on the actual canvas element — 11/11 pass, proving touch → input → physics end-to-end.

---

## `a1a3f0c` — Delta-based steering (Asphalt 9-style) + stronger auto-drive

**2 files · +11 / −8 lines**

- **Delta-based steering:** steer is now proportional to the finger's **offset from the initial touchdown point**, not its absolute position on screen. Touch anywhere → drive straight (auto-drive follows the road). Drag left/right from the touchdown point → steer. Drag back → straighten. Matches Asphalt 9 Legends TouchDrive exactly.
- **Parameters:** full steering lock at 20% of screen width (down from 28%); dead zone 4% (down from 5%) — finer control, less twitchy.
- **Auto-drive tuning:** gain 2.6 → **3.0**, strength 0.65 → **0.75** — stronger road-following while cruising.
- **E2E:** 14 checks confirm center touch = steer 0, drag right/left = full lock, drag back to origin = center, center hold + auto-drive accelerates.

---

## Test summary

| Suite | Checks | Status |
|---|---|---|
| `test/unit.mjs` — pure functions (geo, math, tiles, physics, input, cache, auto-drive, blend) | 77 | ✅ 0 fails |
| `test/smoke.mjs` — headless full boot (spawn, drive, pause, error, location, touch wiring, assist toggle) | 29 | ✅ 0 fails |
| `~/tools/e2e/e2e.mjs` — real DOM + real modules + real PointerEvents (center touch = steer 0, drag = proportional + full lock, auto-drive accelerates, buttons excluded, legacy path) | 14 | ✅ 0 fails |
| **Total** | **120** | **0 failures** |
