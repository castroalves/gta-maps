// Headless integration smoke test: boots the full game with a stubbed
// DOM + mocked network, loads a world, and simulates driving frames.
// Catches runtime errors (bad selectors, undefined refs, renderer bugs)
// that static checks cannot. Run: node test/smoke.mjs

import { Game, GameState } from "../src/core/game.js";

// ---------------------------------------------------------------------
// Browser API stubs
// ---------------------------------------------------------------------

const ctxProxy = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop === "canvas") return {};
      if (prop === "measureText") return () => ({ width: 0 });
      return (...args) => undefined;
    },
    set: () => true,
  }
);

const registry = new Map();
function element(selector) {
  if (!registry.has(selector)) {
    registry.set(selector, {
      hidden: false,
      textContent: "",
      value: "",
      className: "",
      type: "",
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {},
      appendChild() {},
      querySelector: (sel) => element(sel),
      getContext: () => ctxProxy,
      clientWidth: 1280,
      clientHeight: 720,
      width: 0,
      height: 0,
    });
  }
  return registry.get(selector);
}

let rafCallback = null;
globalThis.document = {
  querySelector: (sel) => element(sel),
  createElement: (tag) => element(tag),
};
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
};
globalThis.requestAnimationFrame = (cb) => {
  rafCallback = cb;
  return 1;
};
globalThis.cancelAnimationFrame = () => {};

// Mock network: Overpass (two crossing roads around the queried bbox
// center, like real data), Nominatim, OSM tiles.
const MOCK_WAYS_FOR = (lat, lng) => [
  {
    type: "way",
    id: 1001,
    tags: { highway: "primary", name: "Rua Principal", lanes: "2" },
    geometry: [
      { lat: lat + 0.0015, lon: lng },
      { lat, lon: lng },
      { lat: lat - 0.0015, lon: lng },
    ],
  },
  {
    type: "way",
    id: 1002,
    tags: { highway: "residential", name: "Rua Lateral", lanes: "1" },
    geometry: [
      { lat, lon: lng - 0.0015 },
      { lat, lon: lng },
      { lat, lon: lng + 0.0015 },
    ],
  },
];
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes("overpass")) {
    // Extract the bbox (south,west,north,east) from the query.
    const match = decodeURIComponent(u).match(/\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\);/);
    const [s, w, n, e] = match.slice(1).map(Number);
    return {
      ok: true,
      json: async () => ({ elements: MOCK_WAYS_FOR((s + n) / 2, (w + e) / 2) }),
    };
  }
  if (u.includes("nominatim")) {
    return {
      ok: true,
      json: async () => [
        { lat: "38.7079", lon: "-9.1366", display_name: "Praça do Comércio, Lisboa" },
      ],
    };
  }
  if (u.includes("tile.openstreetmap.org")) {
    return { ok: true, blob: async () => new Blob(["fake-png"]) };
  }
  throw new Error(`unexpected fetch: ${u}`);
};
globalThis.createImageBitmap = async () => ({ width: 256, height: 256 });

// ---------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------

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

const dom = element("#app");
const game = new Game(dom);

await game.init();
check("boots to MENU", game.state === GameState.MENU);

// Geocoder path: search "Lisboa" -> Nominatim mock -> load world.
await game.menu.submit("Lisboa");
check("world loaded -> PLAYING", game.state === GameState.PLAYING);
check("player spawned", game.player !== null);
check("player on road", game.player.onRoad === true);
check("tile manager ready", game.tileManager !== null);
check("attribution set", dom.querySelector("#attribution").textContent.includes("OpenStreetMap"));

// Simulate frames with W held (accelerate + steer right).
let t = 0;
game.input.state.accelerate = true;
game.input.state.right = true;
const startX = game.player.position.x;
const startY = game.player.position.y;
for (let i = 0; i < 5; i++) {
  t += 16.667;
  rafCallback(t);
}
check("tiles requested after first frame", game.tileManager.visibleTiles.length > 0);
for (let i = 5; i < 120; i++) {
  t += 16.667;
  rafCallback(t);
}
check("car accelerated", game.player.speed > 5, `speed=${game.player.speed.toFixed(1)}`);
check("car moved", Math.abs(game.player.position.x - startX) + Math.abs(game.player.position.y - startY) > 1);

// Handbrake + pause + resume.
game.input.state.handbrake = true;
for (let i = 0; i < 30; i++) {
  t += 16.667;
  rafCallback(t);
}
game.togglePause();
check("paused", game.state === GameState.PAUSED);
check("input cleared on pause", game.input.state.accelerate === false);
const frozen = { ...game.player.position };
game.input.state.accelerate = true;
for (let i = 0; i < 30; i++) {
  t += 16.667;
  rafCallback(t);
}
check("physics frozen while paused", game.player.position.x === frozen.x && game.player.position.y === frozen.y);
game.togglePause();
check("resumed", game.state === GameState.PLAYING);
check("input cleared on resume", game.input.state.accelerate === false);

// Debug toggle.
game.toggleDebug();
check("debug on", game.debugEnabled === true);
game.toggleDebug();
check("debug off", game.debugEnabled === false);

// Error path: force road fetch failure -> ERROR state with retry UI.
const realFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error("network down");
};
await game.menu.submit("38.7,-9.1");
check("error state on failure", game.state === GameState.ERROR);
check("error message shown", dom.querySelector("#error").hidden === false);
globalThis.fetch = realFetch;

// Preset location path.
await game.menu.submit("Tokyo, Japan", { label: "Tokyo", lat: 35.6812, lng: 139.7671 });
check("preset location works", game.state === GameState.PLAYING);
check("origin is Tokyo", Math.abs(game.world.origin.lat - 35.6812) < 1e-9);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
