Technical Specification: Browser-Based Top-Down Driving Game on Real-World Maps

1. Objective

Build a browser-based top-down arcade driving game inspired by late-1990s games such as GTA 1 and GTA 2.

The game must use real-world geographic data as its world.

The player should be able to choose a location, spawn a car there, and drive through a representation of the real street network.

The application must be implemented using:

- HTML
- CSS
- Vanilla JavaScript using ES modules
- Canvas 2D
- Browser-native APIs
- Google Maps APIs only where needed for map imagery or geocoding
- OpenStreetMap data only where needed for road geometry and world data

Do not introduce application frameworks, rendering libraries, physics engines, state-management libraries, build frameworks, or utility libraries.

Do not use:

- React
- Vue
- Svelte
- Angular
- Three.js
- PixiJS
- Phaser
- Matter.js
- Rapier
- Zustand
- Lodash
- jQuery
- TypeScript
- npm dependencies unless a later requirement makes them strictly necessary

The first implementation must run from a simple static web application.

The architecture should nevertheless be clean enough to support future traffic, collisions, missions, pedestrians, weapons, police, multiplayer experiments, and richer rendering.

---

2. Product Concept

The player opens the game and sees a location-selection screen.

They can:

- choose from predefined cities;
- enter a city, address, landmark, or coordinates;
- start the game at that location.

Example locations:

- Lisbon
- São Paulo
- Tokyo
- New York

Once the game starts:

- the map is displayed from a top-down perspective;
- the player's car remains approximately centered on screen;
- the world scrolls beneath the player;
- WASD or arrow keys control the car;
- real roads determine where driving is valid;
- driving outside road areas should affect vehicle handling;
- speed and location are shown in a minimal HUD.

The game should feel like an arcade game rather than a geographic visualization tool.

---

3. Core Technical Decision

Use two independent geographic data layers.

Visual layer

Use raster map tiles as the world background.

Preferred implementation:

Google Maps Map Tiles API.

Alternative implementation if Google Maps licensing, quotas, billing, or technical constraints make it impractical:

OpenStreetMap-compatible raster tiles.

The tile provider must be abstracted behind a small adapter so the game engine does not depend on Google-specific behavior.

Gameplay geometry layer

Use OpenStreetMap road data.

OSM must provide road geometry used for:

- road detection;
- road-following NPC traffic later;
- off-road detection;
- future collision generation;
- intersections;
- spawn positions.

The game must never infer gameplay geometry by analyzing map tile pixels.

Visual map imagery and physical world geometry are separate systems.

---

4. Rendering Architecture

Use one HTML "<canvas>" for the main game world.

Suggested HTML:

<body>
  <main id="app">
    <section id="menu"></section>

    <section id="game" hidden>
      <canvas id="game-canvas"></canvas>
      <div id="hud"></div>
    </section>
  </main>

  <script type="module" src="./src/main.js"></script>
</body>

Do not create a DOM element for every world object.

Rendering must happen through Canvas 2D.

The render order should be:

map tiles
road debug geometry, when enabled
world objects
NPC vehicles
player vehicle
particles
debug overlays
HUD remains DOM-based

Set:

ctx.imageSmoothingEnabled = false;

where appropriate to preserve the intended retro visual style.

---

5. Coordinate Systems

This is one of the most important architectural requirements.

Never run vehicle physics directly using latitude and longitude.

Use three coordinate spaces.

Geographic coordinates

{
  lat: 38.7223,
  lng: -9.1393
}

Used only for:

- external APIs;
- map tile calculations;
- geocoding;
- OSM queries;
- translating the local world back into geography.

Local world coordinates

Use meters relative to a geographic origin.

Example:

{
  x: 142.4,
  y: -53.8
}

At game initialization, define:

worldOrigin = {
  lat: spawnLatitude,
  lng: spawnLongitude
};

All gameplay physics must happen in this local Cartesian coordinate system.

Screen coordinates

Pixels relative to the canvas.

Example:

{
  x: 640,
  y: 360
}

The camera converts local world coordinates into screen coordinates.

---

6. Geographic Projection

Implement explicit coordinate utilities.

Required functions:

latLngToWorldMeters(lat, lng, origin)
worldMetersToLatLng(x, y, origin)

latLngToMercator(lat, lng)
mercatorToLatLng(x, y)

latLngToTileCoordinate(lat, lng, zoom)
tileCoordinateToLatLng(tileX, tileY, zoom)

For the small local areas used for gameplay, an equirectangular local approximation is sufficient for gameplay coordinates.

Suggested local conversion:

const EARTH_RADIUS = 6378137;

function latLngToLocalMeters(lat, lng, origin) {
  const lat0 = origin.lat * Math.PI / 180;
  const dLat = (lat - origin.lat) * Math.PI / 180;
  const dLng = (lng - origin.lng) * Math.PI / 180;

  return {
    x: EARTH_RADIUS * dLng * Math.cos(lat0),
    y: -EARTH_RADIUS * dLat
  };
}

The negative Y convention is deliberate so north visually maps upward when rendered using screen-style coordinates.

Inverse conversion must also be implemented.

Do not scatter projection logic across the application.

All conversions belong in a dedicated geo module.

---

7. Suggested Project Structure

/
  index.html
  styles.css

  src/
    main.js

    config/
      game-config.js
      map-config.js

    core/
      game.js
      game-loop.js
      input.js
      camera.js
      event-bus.js

    geo/
      coordinates.js
      mercator.js
      geocoder.js

    map/
      tile-provider.js
      google-tile-provider.js
      osm-tile-provider.js
      tile-manager.js
      tile-cache.js

    world/
      world.js
      road-network.js
      road-loader.js
      road-segment.js
      spatial-index.js

    entities/
      entity.js
      vehicle.js
      player-car.js

    systems/
      physics-system.js
      road-system.js
      collision-system.js
      spawn-system.js

    rendering/
      renderer.js
      map-renderer.js
      vehicle-renderer.js
      debug-renderer.js

    ui/
      menu.js
      hud.js

    assets/
      car-player.png
      car-npc.png

Keep modules small and focused.

Avoid creating abstractions that are not used yet.

---

8. Game Lifecycle

The application should use explicit states:

BOOT
MENU
LOADING_WORLD
PLAYING
PAUSED
ERROR

The "Game" class owns the high-level state.

Example:

class Game {
  constructor() {}

  async init() {}

  async loadWorld(location) {}

  start() {}

  pause() {}

  resume() {}

  update(dt) {}

  render(alpha) {}
}

Do not mix API loading, physics, rendering, and UI logic inside one class.

---

9. Game Loop

Use "requestAnimationFrame".

Physics should use a fixed timestep.

Recommended:

const FIXED_DT = 1 / 60;

Use an accumulator.

Example architecture:

let previousTime = performance.now();
let accumulator = 0;

function frame(now) {
  let frameTime = (now - previousTime) / 1000;
  previousTime = now;

  frameTime = Math.min(frameTime, 0.25);

  accumulator += frameTime;

  while (accumulator >= FIXED_DT) {
    game.update(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  const alpha = accumulator / FIXED_DT;

  game.render(alpha);

  requestAnimationFrame(frame);
}

Do not tie game physics directly to monitor refresh rate.

Do not use variable-timestep physics.

---

10. Input System

Support:

W / Arrow Up
accelerate

S / Arrow Down
brake / reverse

A / Arrow Left
steer left

D / Arrow Right
steer right

Space
handbrake

Escape
pause

D
must not conflict with debug mode; choose another debug key if needed

Input state should be stored as booleans.

Example:

input = {
  accelerate: false,
  brake: false,
  left: false,
  right: false,
  handbrake: false
};

Do not implement driving directly inside keyboard event handlers.

Keyboard events only update input state.

The physics system reads input during simulation updates.

Prevent browser scrolling when arrow keys or Space are being used during gameplay.

---

11. Player Vehicle Model

The first implementation should use arcade car physics rather than rigid-body simulation.

Vehicle state:

{
  position: {
    x: 0,
    y: 0
  },

  previousPosition: {
    x: 0,
    y: 0
  },

  heading: 0,

  previousHeading: 0,

  speed: 0,

  steering: 0,

  throttle: 0,

  onRoad: true
}

Suggested configuration:

const VEHICLE_CONFIG = {
  maxForwardSpeed: 42,
  maxReverseSpeed: 10,

  acceleration: 16,
  reverseAcceleration: 8,
  braking: 28,

  rollingResistance: 1.5,
  aerodynamicDrag: 0.015,

  steeringRate: 2.4,
  steeringResponse: 5,

  offRoadSpeedMultiplier: 0.55,
  offRoadAccelerationMultiplier: 0.45,

  handbrakeTurnMultiplier: 1.8
};

Units:

distance: meters
time: seconds
speed: meters per second
angles: radians

42 m/s is approximately 151 km/h.

These values are initial tuning values and should be centralized in configuration.

---

12. Vehicle Physics

Implement arcade physics manually.

The physics should support:

- acceleration;
- braking;
- reverse;
- rolling resistance;
- speed-dependent steering;
- forward movement;
- off-road slowdown;
- handbrake turning.

Conceptually:

speed += accelerationForce * dt;

speed -= rollingResistance * Math.sign(speed) * dt;

speed -= aerodynamicDrag * speed * Math.abs(speed) * dt;

Clamp speed.

Steering effectiveness should decrease at near-zero speed.

Example:

const speedRatio = Math.min(Math.abs(speed) / 10, 1);

heading += steeringInput
  * steeringRate
  * speedRatio
  * dt
  * Math.sign(speed || 1);

Position:

x += Math.sin(heading) * speed * dt;
y -= Math.cos(heading) * speed * dt;

Tune for responsiveness rather than realism.

The car should be fun to control using keyboard input.

---

13. Camera

The player should remain close to screen center.

Camera state:

{
  x,
  y,
  zoom
}

Do not snap the camera directly to the player's position every frame.

Use smooth following.

Example:

camera.x += (player.x - camera.x) * followSpeed * dt;
camera.y += (player.y - camera.y) * followSpeed * dt;

Optional future behavior:

add a small look-ahead offset based on velocity.

World-to-screen:

screenX =
  canvas.width / 2 +
  (worldX - camera.x) * pixelsPerMeter;

screenY =
  canvas.height / 2 +
  (worldY - camera.y) * pixelsPerMeter;

The player's heading must not rotate the camera in the MVP.

North stays up.

---

14. Resolution and Device Pixel Ratio

Handle high-DPI displays correctly.

The canvas CSS dimensions should match viewport dimensions.

Backing resolution:

canvas.width = width * devicePixelRatio;
canvas.height = height * devicePixelRatio;

Scale rendering accordingly.

Recalculate on window resize.

Cap device pixel ratio if necessary for performance:

Math.min(window.devicePixelRatio, 2)

---

15. Map Tile System

Create a generic tile provider interface.

Conceptually:

class TileProvider {
  getTileUrl({ x, y, zoom }) {
    throw new Error("Not implemented");
  }
}

Google and OSM implementations must conform to the same interface.

The rest of the renderer must not know which provider is being used.

---

16. Tile Manager

"TileManager" responsibilities:

- determine visible tile coordinates;
- request missing tiles;
- cache decoded images;
- remove old tiles from memory;
- avoid duplicate requests;
- provide tile images to the renderer;
- handle failed requests gracefully.

Suggested API:

class TileManager {
  constructor(provider) {}

  update(viewport) {}

  getVisibleTiles() {}

  async loadTile(x, y, zoom) {}

  pruneCache() {}
}

Use "Image" or "createImageBitmap" depending on browser compatibility and response constraints.

Prefer "createImageBitmap" where practical.

---

17. Tile Selection

Use standard Web Mercator slippy-map tile coordinates.

For zoom level "z":

const n = 2 ** z;

const x =
  Math.floor(
    ((lng + 180) / 360) * n
  );

const latRad = lat * Math.PI / 180;

const y =
  Math.floor(
    (
      1 -
      Math.asinh(Math.tan(latRad)) / Math.PI
    ) / 2 * n
  );

Rendering must support fractional tile offsets so scrolling is smooth.

Do not align the player or camera to integer tile boundaries.

---

18. Map Zoom

Use a fixed geographic map zoom initially.

Recommended starting point:

zoom = 18

Make this configurable.

Game visual zoom should be decoupled from tile zoom where possible.

Do not continuously change provider zoom during normal gameplay in the MVP.

---

19. Tile Cache

Maintain an in-memory LRU-style cache.

A simple implementation is sufficient.

Example maximum:

MAX_TILE_CACHE_SIZE = 200

Each cache entry should track:

{
  key,
  image,
  lastUsedAt,
  status
}

Do not store third-party map tiles permanently unless permitted by the provider's terms.

Do not implement offline map downloading.

---

20. Map Attribution

Map attribution must always remain visible if required by the selected provider.

The attribution UI must not be obscured by HUD elements.

Do not remove provider logos or copyright notices.

Centralize attribution markup in the map-provider configuration.

---

21. OSM Road Data

Use OpenStreetMap road geometry for gameplay.

The MVP may query Overpass API.

Example conceptual query:

[out:json];

way
  ["highway"]
  (south,west,north,east);

out geom;

Do not query an enormous region.

Load only a bounded area around the spawn location.

Initial world radius:

1000–1500 meters

The exact bounding box should be generated from the requested radius.

---

22. OSM Road Filtering

Initially include drivable road types such as:

motorway
trunk
primary
secondary
tertiary
unclassified
residential
service
living_street

Ignore by default:

footway
pedestrian
cycleway
steps
path
bridleway
construction
proposed

Treat "track" conservatively and disable it initially unless required.

Respect relevant access tags where practical:

access=no
motor_vehicle=no
vehicle=no

The MVP does not need perfect routing semantics.

---

23. Road Network Representation

Convert OSM ways into local-meter polylines.

Example:

{
  id: "way-12345",

  type: "residential",

  width: 7,

  points: [
    { x: 12, y: -43 },
    { x: 30, y: -52 },
    { x: 61, y: -60 }
  ],

  tags: {}
}

Split each polyline into road segments.

Example:

{
  roadId,
  ax,
  ay,
  bx,
  by,
  width
}

This segment representation will support:

- nearest-road queries;
- off-road detection;
- traffic following;
- intersection analysis later.

---

24. Road Width Estimation

OSM does not consistently provide exact physical widths.

Use an approximation table.

Example:

const ROAD_WIDTHS = {
  motorway: 14,
  trunk: 12,
  primary: 11,
  secondary: 10,
  tertiary: 9,
  residential: 7,
  unclassified: 7,
  service: 5,
  living_street: 6
};

If the road has:

width=*

use it when parsable.

If lanes are available, optionally estimate:

road width ≈ lanes × 3.2 meters

Explicit "width" takes priority.

Then lane-derived width.

Then type-based fallback.

---

25. Point-to-Road Distance

Implement a standard point-to-line-segment distance function.

Required API:

distancePointToSegment(px, py, ax, ay, bx, by)

Determine whether the player is on-road by finding the closest nearby road segment.

Conceptually:

distanceToCenterline <= roadWidth / 2 + tolerance

Suggested tolerance:

1.5 meters

The result should include:

{
  onRoad,
  distance,
  segment,
  road
}

---

26. Spatial Index

Do not iterate over every road segment every simulation frame.

Implement a basic uniform spatial grid.

No external spatial-indexing library.

Example cell size:

CELL_SIZE = 100;

Store segments by grid cell.

Example:

Map<string, RoadSegment[]>

Key:

`${cellX}:${cellY}`

When checking the player's road position, search:

- current cell;
- neighboring eight cells.

This should be sufficient for the MVP.

---

27. Spawn Logic

The player should spawn on a valid road.

Given a requested geographic location:

1. load nearby road data;
2. find the nearest valid road segment;
3. project the requested point onto that segment;
4. spawn the player at the projected location;
5. derive initial heading from the segment direction.

If there is no valid road within a configured threshold, report an error and offer another location.

Suggested maximum spawn search distance:

500 meters

---

28. Location Search

Support two forms.

Coordinates

Accept:

38.7223,-9.1393

Parse directly.

Place search

Use the configured geocoding provider.

If using Google:

use the appropriate Google geocoding or place-search API.

Return normalized:

{
  label,
  lat,
  lng
}

Do not let geocoding API details leak into game logic.

---

29. Menu

The initial menu should include:

game title

location search field

Play button

preset buttons:
Lisbon
São Paulo
Tokyo
New York

While loading:

Loading map...
Loading roads...
Preparing world...

Display meaningful errors.

Example:

Could not load road data for this location.
Try another place.

Avoid developer-oriented error messages in user-facing UI.

Log technical errors to the console.

---

30. HUD

Display:

speed in km/h
location coordinates
on-road / off-road state in debug mode only
FPS in debug mode only

Speed conversion:

kmh = Math.abs(speed) * 3.6;

HUD should use HTML/CSS rather than Canvas unless there is a strong reason otherwise.

Style should reference late-1990s arcade games without copying copyrighted UI assets.

---

31. Player Rendering

The player vehicle may initially be rendered as a simple procedural shape.

Preferred during initial implementation:

draw the car using Canvas primitives.

Example:

body rectangle
windshield rectangle
front indicator
shadow

This avoids blocking gameplay work on art assets.

Later support optional sprite assets.

The car must visually rotate according to heading.

Use:

ctx.save();
ctx.translate(screenX, screenY);
ctx.rotate(heading);
...
ctx.restore();

---

32. Retro Visual Treatment

The game should have a late-1990s visual character without interfering with map readability.

Possible techniques:

reduced saturation
higher contrast
pixel-style HUD typography
hard shadows
limited color palette for game objects
subtle screen grain
optional scanlines
low-resolution internal rendering later

Do not apply expensive per-pixel Canvas image filters every frame.

Prefer CSS filters or preprocessed assets where possible.

The MVP should prioritize performance and control feel over visual effects.

---

33. Off-Road Behavior

When outside a valid road area:

maxSpeed *= offRoadSpeedMultiplier;
acceleration *= offRoadAccelerationMultiplier;

Optional:

increase rolling resistance.

Do not abruptly teleport or stop the car.

Driving off-road must remain possible.

Future versions may use surface information from OSM.

---

34. World Boundaries

OSM road data is loaded for a limited area.

When the player approaches the loaded world's boundary, the game should eventually load adjacent data.

For the first MVP, dynamic road streaming is optional.

The initial implementation may instead display a warning:

Leaving loaded area

If the player continues beyond available data:

- map tiles may continue rendering;
- road detection becomes unknown;
- treat the surface as off-road.

Do not crash.

Architect "RoadLoader" so dynamic region loading can be added later.

---

35. Map Streaming

Map tiles must already stream based on camera position.

Only visible and near-visible tiles should be loaded.

Include one-tile overscan around the viewport to prevent blank edges during movement.

Tile loading should not block physics.

Missing tiles should render a neutral fallback background until loaded.

---

36. Network Failure Handling

External requests can fail.

Handle:

network unavailable
tile request failure
OSM request failure
rate limiting
geocoder failure
invalid location
malformed API response

Gameplay must not throw uncaught exceptions.

Road-data loading failure should return the player to the menu or display a retry action.

A few missing tiles should not stop gameplay.

---

37. API Configuration

Never hard-code sensitive secrets directly inside application modules if avoidable.

For a purely static MVP, a browser API key may necessarily be visible.

If using a Google browser key:

restrict it using the provider's supported restrictions, including domain/referrer and API restrictions.

Keep configuration in:

src/config/map-config.js

Example:

export const MAP_CONFIG = {
  provider: "google",
  googleApiKey: "",
  tileZoom: 18
};

Do not commit real private keys into the repository.

Provide placeholder configuration.

---

38. Security Requirements

The application must not use "eval".

Do not create HTML from untrusted geocoder or OSM values using "innerHTML".

Prefer:

textContent

Validate numeric values received from APIs.

Validate parsed coordinates.

Clamp latitude to Web Mercator-safe ranges.

Handle malformed OSM nodes and ways without crashing.

Do not execute external scripts dynamically based on API responses.

---

39. Performance Targets

Desktop target:

60 FPS under normal gameplay

Acceptable minimum:

30 FPS on lower-powered devices

Avoid allocations inside high-frequency update loops where practical.

Do not create new arrays unnecessarily every frame.

Reuse objects for frequently updated vectors if it improves performance.

Only road segments near the player should participate in road queries.

Only visible world objects should render.

Map loading must remain asynchronous.

---

40. Debug Mode

Implement a debug overlay toggle.

Suggested key:

F3

Debug rendering should display:

player local coordinates
player geographic coordinates
speed
heading
FPS
camera position
current tile coordinates
road segment count
road spatial-grid cells
nearest road
distance to nearest road
road boundary
world origin
loaded OSM bounding box

Draw OSM road centerlines over the map when debug mode is active.

Color or style roads differently from gameplay graphics.

Debug features must be isolated from normal rendering.

---

41. Debug Geometry

When enabled:

draw each nearby road segment as:

ctx.beginPath();
ctx.moveTo(...);
ctx.lineTo(...);
ctx.stroke();

Optionally draw estimated road width.

Also render:

nearest-point projection
distance line from car to road
spatial-grid boundaries

This debug layer is essential for validating coordinate transformations.

---

42. Error Logging

Create a minimal logger.

Example:

logger.info()
logger.warn()
logger.error()

Use console output.

Prefix messages:

[game]
[map]
[osm]
[geo]
[physics]

Do not introduce an observability SDK in the MVP.

---

43. Main Classes and Responsibilities

Game

Owns application lifecycle and top-level game state.

GameLoop

Owns fixed-timestep scheduling.

Input

Tracks keyboard state.

Camera

Converts world position into screen position.

Renderer

Coordinates all drawing.

TileManager

Loads and caches map tiles.

TileProvider

Builds provider-specific tile requests.

RoadLoader

Loads OSM road data.

RoadNetwork

Owns normalized road geometry.

SpatialIndex

Indexes road segments.

Vehicle

Contains generic vehicle simulation state.

PlayerCar

Adds player input interpretation.

PhysicsSystem

Updates vehicle movement.

RoadSystem

Determines nearest-road and on-road state.

HUD

Displays player information.

Keep these responsibilities explicit.

---

44. Entity Architecture

Do not build a complex ECS.

A simple class-based architecture is sufficient.

Base entity:

class Entity {
  constructor() {
    this.id = crypto.randomUUID();
    this.active = true;
  }

  update(dt) {}

  render(renderer) {}
}

Avoid inheritance where composition is simpler.

Do not create speculative abstractions for future entity types.

---

45. Game Configuration

Centralize tunable values.

Example:

export const GAME_CONFIG = {
  physicsHz: 60,

  worldLoadRadius: 1500,

  roadSearchRadius: 50,

  spatialCellSize: 100,

  pixelsPerMeter: 3,

  tileZoom: 18,

  cameraFollowSpeed: 8,

  maxFrameTime: 0.25
};

Do not scatter magic numbers throughout the codebase.

---

46. Road Loading Workflow

World initialization should follow this exact sequence:

resolve requested location

set geographic world origin

calculate OSM bounding box

fetch OSM road geometry

normalize OSM ways

convert lat/lng points to local meters

estimate road widths

create road segments

build spatial index

find nearest valid spawn road

position player

initialize camera

initialize map tile manager

start game loop

Map tile loading may continue asynchronously after gameplay starts.

Road geometry must be available before normal driving begins.

---

47. OSM Normalization

Overpass responses may contain ways and geometry.

Normalize immediately.

Do not let raw Overpass JSON propagate throughout the application.

Convert into internal objects.

Example:

{
  id,
  highway,
  name,
  oneWay,
  lanes,
  width,
  points
}

Discard malformed geometry.

A road needs at least two valid points.

---

48. OSM Query Abstraction

Create:

async function fetchRoads(bounds) {}

The default implementation can use Overpass.

Keep endpoint configuration external.

Example:

export const OSM_CONFIG = {
  overpassEndpoint:
    "https://overpass-api.de/api/interpreter"
};

The rest of the application should not depend directly on Overpass query syntax.

---

49. API Throttling and Caching

Do not repeatedly request the same OSM region.

Cache loaded road regions in memory.

Use a simple region key based on rounded bounding-box or chunk coordinates.

Avoid aggressive automated requests to public Overpass instances.

Do not implement uncontrolled background crawling.

---

50. Pause Behavior

When paused:

- physics stops;
- game simulation stops;
- map remains visible;
- keyboard driving input is cleared;
- pause overlay appears.

Do not allow held keys from before pause to remain active after resume.

---

51. Browser Support

Primary target:

latest desktop versions of:

Chrome
Edge
Firefox
Safari

Mobile controls are out of scope for the MVP.

The layout should not catastrophically break on mobile, but touch driving controls are not required.

---

52. Audio

Audio is optional for the first milestone.

If implemented, use Web Audio API only.

Possible later sounds:

engine
braking
skid
collision
UI

Do not add an audio library.

---

53. MVP Scope

The first playable version must include only:

location selection

real map background

OSM road loading

player spawn on a real road

top-down player car

keyboard driving

arcade physics

camera following

road detection

off-road slowdown

speed HUD

debug road overlay

tile streaming

basic error handling

Do not implement traffic, pedestrians, missions, police, weapons, damage, multiplayer, buildings, routing, or procedural content before the MVP works well.

---

54. Development Milestones

Milestone 1 — Static Driving Prototype

Implement:

canvas
game loop
keyboard input
car physics
camera
procedural player car
empty grid background
HUD

Acceptance criteria:

The player can drive indefinitely around a fake Cartesian world at stable frame rate.

---

Milestone 2 — Geographic Coordinates

Implement:

world origin
lat/lng conversion
Mercator helpers
world-to-screen conversion
coordinate debug overlay

Acceptance criteria:

Known geographic points convert to expected local positions and round-trip with low error.

---

Milestone 3 — Map Tiles

Implement:

tile provider
tile manager
tile cache
Web Mercator tile math
visible-tile calculation
map rendering

Acceptance criteria:

The real-world map scrolls smoothly under the car and remains aligned with geographic coordinates.

---

Milestone 4 — OSM Roads

Implement:

Overpass query
OSM normalization
road width estimation
local-coordinate conversion
road debug rendering

Acceptance criteria:

OSM road centerlines visually align with the corresponding roads visible on the map.

This alignment is a major correctness checkpoint.

Do not proceed if the geometry is visibly misaligned.

---

Milestone 5 — Road Gameplay

Implement:

road segments
spatial index
nearest-road query
on-road detection
off-road vehicle behavior
road-based player spawn

Acceptance criteria:

The game reliably detects whether the player is on a road and changes vehicle handling appropriately.

---

Milestone 6 — Location Selection

Implement:

preset cities
coordinate input
geocoding search
loading UI
errors

Acceptance criteria:

The player can choose multiple cities and begin driving on real streets.

---

Milestone 7 — Polish

Improve:

vehicle handling
camera motion
retro visual style
loading transitions
tile overscan
cache pruning
debug tools
error states

Acceptance criteria:

The game feels like an arcade driving prototype rather than a map demo.

---

55. Acceptance Tests

The finished MVP must satisfy all of the following.

Startup

Opening "index.html" through a local static server loads the menu without console errors.

Driving

The player can:

accelerate
brake
reverse
steer
use handbrake
pause
resume

Frame independence

Vehicle behavior remains approximately equivalent at:

30 FPS
60 FPS
120 FPS

because physics uses a fixed timestep.

Geographic alignment

OSM road geometry aligns visually with the selected map imagery within expected differences between providers.

Spawn

Starting at a city center places the player on or near a valid road.

Tile rendering

Driving across tile boundaries produces no visible snapping of game geometry.

Road detection

Road status updates without iterating across all loaded roads.

Network errors

Failed map or OSM requests result in controlled fallback or error UI instead of crashes.

Resize

Resizing the browser keeps rendering correctly aligned.

Debug mode

F3 toggles debug information without affecting physics.

---

56. Unit-Testable Pure Functions

Even without introducing a testing framework yet, implement core calculations as pure functions.

Important candidates:

latLngToLocalMeters()
localMetersToLatLng()

latLngToTileCoordinate()

distancePointToSegment()

projectPointOntoSegment()

calculateBoundingBox()

estimateRoadWidth()

parseCoordinateInput()

clamp()

lerp()

Functions should not depend on DOM state.

This allows a test harness to be added later.

---

57. Manual Geographic Validation

Use at least three test locations:

Lisbon
São Paulo
Tokyo

Verify:

map orientation
OSM road alignment
spawn placement
projection accuracy
road-width approximation
tile transitions

Testing multiple latitudes helps detect projection mistakes.

---

58. Coding Style

Use modern JavaScript.

Prefer:

const
let
class
async / await
ES modules
private module scope
destructuring where useful

Avoid:

var
global mutable variables
deep callback nesting
monolithic files
implicit type coercion where risky

Use semicolons consistently.

Use descriptive variable names.

Gameplay math may use short conventional vector names where obvious.

---

59. Comments

Comments should explain:

why a mathematical conversion is required
why a browser/provider workaround exists
why a non-obvious algorithm was selected

Do not comment obvious syntax.

Bad:

// Increase speed
speed += acceleration;

Useful:

// Physics uses local meters rather than lat/lng so vehicle dynamics
// remain independent of latitude and map projection.

---

60. Performance Instrumentation

Track:

fps
frameDuration
visibleTiles
loadedTiles
roadSegments
nearbyRoadSegments

Expose these values in debug mode.

Do not perform expensive profiling continuously outside debug mode.

---

61. Future Architecture Requirements

The MVP architecture should make the following possible without major rewrites.

Traffic

NPC cars following OSM road segments.

Intersections

Create a graph from shared OSM nodes.

Routing

Generate routes through the road graph.

Collision

Generate simplified collision shapes from roads and buildings.

Buildings

Load OSM building polygons.

Missions

Use geographic landmarks or generated locations.

Streaming

Load road chunks as the player moves.

Minimap

Reuse road data at reduced scale.

Police

Spawn and route vehicles through the road graph.

Multiple map providers

Switch tile providers through configuration.

These features must not be implemented during the MVP unless explicitly requested.

---

62. Explicit Non-Goals

Do not attempt:

photorealistic 3D

full vehicle simulation

Google Maps Street View rendering

automatic road extraction from imagery

offline downloading of entire cities

full OpenStreetMap routing

realistic traffic simulation

multiplayer

server-side architecture

account system

database

build pipeline

framework migration

Keep the MVP client-side and small.

---

63. Legal and Provider Constraints

Treat map imagery and OSM data as third-party licensed content.

The implementation must:

- preserve required map attribution;
- preserve OpenStreetMap attribution;
- respect provider API usage restrictions;
- avoid extracting geographic features from map imagery;
- avoid bulk downloading map imagery;
- avoid permanent caching where prohibited;
- avoid exposing unrestricted API credentials.

Keep provider-specific behavior isolated so map providers can be changed later.

---

64. Google Maps Integration Boundary

If Google Maps tiles require SDK-specific setup, isolate it entirely inside:

google-tile-provider.js
geocoder.js

Nothing in:

physics
road network
game loop
player
camera
renderer

should import Google-specific APIs directly.

The game must remain capable of running with a different tile provider by changing configuration and provider implementation.

---

65. Recommended Implementation Order for Codex

Implement this specification incrementally.

Do not attempt to build everything in one pass.

For each milestone:

1. implement the smallest complete vertical slice;
2. run it in the browser;
3. fix runtime errors;
4. verify visual behavior;
5. keep existing functionality working;
6. only then proceed to the next milestone.

Do not create placeholder architecture for later features unless required by a currently implemented feature.

Prefer working code over speculative abstractions.

---

66. Definition of Done

The MVP is complete when a user can:

1. open the game;
2. select Lisbon, São Paulo, Tokyo, New York, coordinates, or a searched location;
3. wait for nearby world data to load;
4. spawn on a real road;
5. drive using keyboard controls;
6. see the real-world map move beneath the vehicle;
7. remain geographically aligned with the road network;
8. experience reduced traction or speed while off-road;
9. see current speed;
10. pause and resume;
11. enable debug mode and verify OSM road alignment;
12. drive for several minutes without memory growth, crashes, or obvious tile-loading failures.

The implementation should prioritize, in this order:

correct coordinate math
responsive vehicle controls
map/OSM alignment
stable rendering
clear architecture
performance
visual polish

If a design decision conflicts with these priorities, choose the option that preserves the earlier priority.

---

67. Initial Deliverable Expected From Codex

Create the full project structure and implement Milestones 1 through 5 first.

The first meaningful deliverable should already allow the developer to:

open the application

start at a hard-coded Lisbon coordinate

see real-world map imagery

see OSM roads in debug mode

drive a vehicle

have the camera follow the vehicle

detect whether the vehicle is on a road

experience off-road slowdown

Use approximately:

Praça do Comércio, Lisbon
38.7079
-9.1366

as the initial default world origin.

Do not spend time creating a polished location-selection interface before the driving and geographic systems work correctly.

After Milestones 1–5 are stable, implement the location-selection and polish milestones.

---

68. Final Instruction to Codex

Treat this as a small game engine, not as a conventional map application.

The map is a rendered world layer.

OSM is gameplay geometry.

The local Cartesian world is the authoritative simulation space.

Latitude and longitude exist only at the integration boundaries.

Keep the implementation dependency-free, understandable, debuggable, and easy to modify.

Do not add libraries merely to reduce implementation effort when the required functionality can reasonably be implemented with browser APIs and a small amount of JavaScript
