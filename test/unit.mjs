// Ad-hoc unit tests for DOM-free modules. Run: node test/unit.mjs
import {
  latLngToLocalMeters,
  localMetersToLatLng,
  latLngToTileCoordinate,
  tileCoordinateToLatLng,
} from "../src/geo/coordinates.js";
import {
  distancePointToSegment,
  projectPointOntoSegment,
  calculateBoundingBox,
} from "../src/geo/geometry.js";
import { parseCoordinateInput } from "../src/geo/geocoder.js";
import { normalizeRoad, estimateRoadWidth } from "../src/world/road-loader.js";
import { SpatialIndex } from "../src/world/spatial-index.js";
import { RoadNetwork } from "../src/world/road-network.js";
import { PlayerCar } from "../src/entities/player-car.js";
import { PhysicsSystem } from "../src/systems/physics-system.js";
import { RoadSystem } from "../src/systems/road-system.js";
import { SpawnSystem } from "../src/systems/spawn-system.js";
import { Camera } from "../src/core/camera.js";
import { TileCache } from "../src/map/tile-cache.js";
import { GAME_CONFIG } from "../src/config/game-config.js";
import { EsriTileProvider } from "../src/map/esri-tile-provider.js";
import { CartoTileProvider } from "../src/map/carto-tile-provider.js";
import { createTileProvider } from "../src/map/provider-registry.js";

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// 1. Local meters round trip at multiple latitudes.
console.log("coordinates round-trip");
for (const [label, lat, lng] of [
  ["Lisbon", 38.7079, -9.1366],
  ["SaoPaulo", -23.5505, -46.6333],
  ["Tokyo", 35.6812, 139.7671],
  ["NewYork", 40.758, -73.9855],
]) {
  const origin = { lat, lng };
  const local = latLngToLocalMeters(lat, lng, origin);
  check(`${label} origin -> 0,0`, close(local.x, 0) && close(local.y, 0));
  const offset = latLngToLocalMeters(lat + 0.001, lng + 0.001, origin);
  const back = localMetersToLatLng(offset.x, offset.y, origin);
  check(`${label} round trip lat`, close(back.lat, lat + 0.001, 1e-9));
  check(`${label} round trip lng`, close(back.lng, lng + 0.001, 1e-9));
  // North must be negative Y (north-up screen convention).
  const north = latLngToLocalMeters(lat + 0.005, lng, origin);
  check(`${label} north is -Y`, north.y < 0);
  // East must be positive X.
  const east = latLngToLocalMeters(lat, lng + 0.005, origin);
  check(`${label} east is +X`, east.x > 0);
}

// 2. Tile coordinate round trip.
console.log("tile math");
for (const [lat, lng] of [[38.7079, -9.1366], [-23.55, -46.63], [35.68, 139.76]]) {
  const tile = latLngToTileCoordinate(lat, lng, 18);
  const corner = tileCoordinateToLatLng(tile.x, tile.y, 18);
  // The tile's top-left corner is north-west of the point it contains.
  check(`tile top edge north of point`, corner.lat >= lat);
  check(`tile left edge west of point`, corner.lng <= lng);
  // A point at the tile's interior must map back to the same tile.
  const br = tileCoordinateToLatLng(tile.x + 1, tile.y + 1, 18);
  const mid = latLngToTileCoordinate((corner.lat + br.lat) / 2, (corner.lng + br.lng) / 2, 18);
  check("tile interior round trip", mid.x === tile.x && mid.y === tile.y);
}
check("tile 0,0 is top-left", close(tileCoordinateToLatLng(0, 0, 1).lat, 85.05112878, 1e-4));

// 3. Segment geometry.
console.log("segment geometry");
check("distance perpendicular", close(distancePointToSegment(0, 1, -5, 0, 5, 0), 1));
check("distance beyond end", close(distancePointToSegment(10, 0, -5, 0, 5, 0), 5));
check("projection midpoint", projectPointOntoSegment(0, 1, -5, 0, 5, 0).x === 0);
const bbox = calculateBoundingBox(38.7, -9.13, 1500);
check("bbox north > lat", bbox.north > 38.7);
check("bbox south < lat", bbox.south < 38.7);
check("bbox east > lng", bbox.east > -9.13);
check("bbox west < lng", bbox.west < -9.13);

// 4. Coordinate input parsing.
console.log("coordinate parsing");
check("comma parse", parseCoordinateInput("38.7223,-9.1393")?.lat === 38.7223);
check("semicolon parse", parseCoordinateInput("38.7223;-9.1393")?.lng === -9.1393);
check("space parse", parseCoordinateInput("38.7223 -9.1393") !== null);
check("reject text", parseCoordinateInput("Lisbon") === null);
check("reject bad lat", parseCoordinateInput("95,10") === null);
check("reject bad lng", parseCoordinateInput("10,190") === null);

// 5. OSM normalization + width estimation.
console.log("osm normalization");
const way = {
  type: "way",
  id: 123,
  tags: { highway: "residential", lanes: "2", name: "Rua X" },
  geometry: [
    { lat: 38.7, lon: -9.13 },
    { lat: 38.701, lon: -9.13 },
    { lat: 38.702, lon: -9.13 },
  ],
};
const road = normalizeRoad(way);
check("normalize ok", road !== null && road.id === 123 && road.highway === "residential");
check("width lanes estimate", close(estimateRoadWidth(road), 6.4));
road.width = 12;
check("width explicit wins", close(estimateRoadWidth(road), 12));
const blocked = normalizeRoad({ ...way, tags: { ...way.tags, access: "no" } });
check("access=no filtered", blocked === null);
const footway = normalizeRoad({ ...way, tags: { highway: "footway" } });
check("footway filtered", footway === null);

// 6. Spatial index.
console.log("spatial index");
const index = new SpatialIndex(100);
const seg = { ax: 0, ay: 0, bx: 250, by: 0 };
index.insert(seg);
check("insert count", index.segmentCount === 1);
const hits = index.query(50, 0, 0);
check("query own cell", hits.includes(seg));
check("cells 3 (spans 3 cells)", index.cellCount === 3);

// 7. Road network + spawn + road system.
console.log("road network");
const origin = { lat: 38.7079, lng: -9.1366 };
const fakeRoads = [
  {
    id: 1,
    highway: "residential",
    name: "Test St",
    oneWay: false,
    lanes: 2,
    width: 0,
    points: [
      { lat: origin.lat + 0.0005, lng: origin.lng },
      { lat: origin.lat - 0.0005, lng: origin.lng },
    ],
  },
];
const network = new RoadNetwork(GAME_CONFIG.spatialCellSize);
network.build(fakeRoads, origin, calculateBoundingBox(origin.lat, origin.lng, 1500));
const world = { origin, roadNetwork: network };
const near = network.nearestRoad(0, 0, 100);
check("nearest road found", near !== null && close(near.distance, 0, 0.5));
const spawn = new SpawnSystem(world).findSpawn(origin.lat, origin.lng);
check("spawn on road", close(spawn.x, 0, 0.5) && close(spawn.y, 0, 0.5));
check("spawn heading north-ish", close(Math.abs(spawn.heading), 0, 0.1) || close(Math.abs(spawn.heading), Math.PI, 0.1));
const car = new PlayerCar();
car.snapPosition(spawn.x, spawn.y, spawn.heading);
const roadSystem = new RoadSystem(world);
roadSystem.update(car);
check("on road", car.onRoad === true);
car.snapPosition(200, 200, 0);
roadSystem.update(car);
check("off road", car.onRoad === false);

// 8. Physics: acceleration, top speed, braking, frame independence.
console.log("physics");
const phys = new PhysicsSystem();
const car2 = new PlayerCar();
car2.snapPosition(0, 0, 0);
car2.interpretInput({ accelerate: true, brake: false, left: false, right: false, handbrake: false });
const dt = 1 / 60;
for (let i = 0; i < 60 * 8; i++) phys.update(car2, dt);
check("reaches near max speed", Math.abs(car2.speed - car2.config.maxForwardSpeed) < 0.5, `speed=${car2.speed}`);
car2.interpretInput({ accelerate: false, brake: true, left: false, right: false, handbrake: false });
for (let i = 0; i < 60 * 3; i++) phys.update(car2, dt);
check("brakes to reverse", car2.speed < -1, `speed=${car2.speed}`);

// Frame independence: 60Hz x 2s vs 120Hz x 2s.
const a = new PlayerCar();
a.snapPosition(0, 0, 0);
a.interpretInput({ accelerate: true, brake: false, left: true, right: false, handbrake: false });
for (let i = 0; i < 60 * 2; i++) phys.update(a, 1 / 60);
const b = new PlayerCar();
b.snapPosition(0, 0, 0);
b.interpretInput({ accelerate: true, brake: false, left: true, right: false, handbrake: false });
for (let i = 0; i < 120 * 2; i++) phys.update(b, 1 / 120);
check(
  "frame independence",
  close(a.position.x, b.position.x, 0.5) && close(a.position.y, b.position.y, 0.5) && close(a.speed, b.speed, 0.5),
  `a=(${a.position.x.toFixed(2)},${a.position.y.toFixed(2)}) b=(${b.position.x.toFixed(2)},${b.position.y.toFixed(2)})`
);

// Steering: hold D -> heading should increase (clockwise = east from north).
const c = new PlayerCar();
c.snapPosition(0, 0, 0);
c.interpretInput({ accelerate: true, brake: false, left: false, right: true, handbrake: false });
for (let i = 0; i < 60 * 3; i++) phys.update(c, dt);
check("D turns right (heading grows)", c.heading > 0.5, `heading=${c.heading}`);

// Off-road multiplier.
const d = new PlayerCar();
d.snapPosition(0, 0, 0);
d.onRoad = false;
d.interpretInput({ accelerate: true, brake: false, left: false, right: false, handbrake: false });
for (let i = 0; i < 60 * 8; i++) phys.update(d, dt);
check(
  "off-road top speed reduced",
  d.speed < d.config.maxForwardSpeed * 0.7,
  `speed=${d.speed}`
);

// 9. Camera.
console.log("camera");
const cam = new Camera();
cam.setViewport(800, 600);
cam.x = 0;
cam.y = 0;
const s = cam.worldToScreen(0, 0);
check("camera centers origin", close(s.x, 400) && close(s.y, 300));

// 10. Tile cache LRU.
console.log("tile cache");
const cache = new TileCache(3);
cache.set("a", { status: "ready" });
cache.set("b", { status: "ready" });
cache.set("c", { status: "ready" });
cache.get("a"); // touch a
cache.set("d", { status: "ready" }); // evicts b
check("LRU eviction", cache.get("b") === undefined && cache.get("a") !== undefined && cache.get("d") !== undefined);

// 11. Provider URL formats.
console.log("tile providers");
const esri = new EsriTileProvider("World_Street_Map");
const esriUrl = esri.getTileUrl({ x: 124418, y: 100459, zoom: 18 });
check("esri uses z/y/x order", esriUrl.includes("/18/100459/124418") && !esriUrl.includes("/18/124418/100459"), esriUrl);
const carto = new CartoTileProvider("dark_all");
check("carto url", carto.getTileUrl({ x: 1, y: 2, zoom: 3 }) === "https://a.basemaps.cartocdn.com/dark_all/3/1/2.png");
check("provider registry default", createTileProvider("osm").getTileUrl({ x: 1, y: 2, zoom: 3 }) === "https://tile.openstreetmap.org/3/1/2.png");
check("registry esri-streets", createTileProvider("esri-streets").getAttribution().includes("Esri"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
