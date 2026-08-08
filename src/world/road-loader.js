// OSM road loading via the Overpass API.
//
// Raw Overpass JSON is normalized into internal road objects here and
// never propagates further into the application. Loaded regions are
// cached in memory so we do not repeatedly hammer public instances.

import { OSM_CONFIG, DRIVABLE_HIGHWAY_RE, ROAD_TYPES } from "../config/map-config.js";
import { logger } from "../utils/logger.js";

const ACCESS_BLOCKED = new Set(["no", "private"]);

export function buildOverpassQuery(bounds) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  return [
    "[out:json][timeout:25];",
    "(",
    `way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)$"](${bbox});`,
    ");",
    "out geom;",
  ].join("");
}

// Normalize one Overpass way element. Returns null for non-drivable or
// malformed geometry (a road needs at least two valid points).
export function normalizeRoad(element) {
  const tags = element.tags || {};
  const highway = tags.highway || "";
  if (!DRIVABLE_HIGHWAY_RE.test(highway)) return null;

  const access = tags.access || "";
  const motorVehicle = tags["motor_vehicle"] || "";
  const vehicle = tags.vehicle || "";
  if (
    ACCESS_BLOCKED.has(access) ||
    ACCESS_BLOCKED.has(motorVehicle) ||
    ACCESS_BLOCKED.has(vehicle)
  ) {
    return null;
  }

  const geometry = element.geometry || [];
  if (geometry.length < 2) return null;
  const points = [];
  for (const node of geometry) {
    const lat = Number(node.lat);
    const lng = Number(node.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    points.push({ lat, lng });
  }
  if (points.length < 2) return null;

  const lanes = parseInt(tags.lanes, 10);
  const width = parseFloat(tags.width);

  return {
    id: element.id,
    highway,
    name: typeof tags.name === "string" ? tags.name : "",
    oneWay: tags.oneway === "yes" || tags.oneway === "1" || tags.oneway === "true",
    lanes: Number.isFinite(lanes) && lanes > 0 ? lanes : 0,
    width: Number.isFinite(width) && width > 0 ? width : 0,
    points,
  };
}

// Explicit width > lane-derived estimate > type-based fallback.
export function estimateRoadWidth(road, widthTable = ROAD_TYPES) {
  if (road.width > 0) return road.width;
  if (road.lanes > 0) return road.lanes * 3.2;
  return widthTable[road.highway] || 7;
}

// ---------------------------------------------------------------------
// Region caching
// ---------------------------------------------------------------------

const regionCache = new Map();
const REGION_CACHE_MAX = 8;

function regionKey(bounds) {
  // Round to ~0.002° (~200 m) so nearby loads reuse the same region.
  const round = (v) => Math.round(v * 500) / 500;
  return `${round(bounds.south)},${round(bounds.west)},${round(bounds.north)},${round(bounds.east)}`;
}

export async function fetchRoads(bounds) {
  const key = regionKey(bounds);
  if (regionCache.has(key)) {
    logger.info("osm", "road region cache hit:", key);
    return regionCache.get(key);
  }

  const query = buildOverpassQuery(bounds);
  const url = `${OSM_CONFIG.overpassEndpoint}?data=${encodeURIComponent(query)}`;
  logger.info("osm", "fetching roads for bounds", bounds);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Overpass returned HTTP ${response.status}`);
  }
  const json = await response.json();

  const roads = [];
  for (const element of json.elements || []) {
    if (element.type !== "way") continue;
    const road = normalizeRoad(element);
    if (road) roads.push(road);
  }

  regionCache.set(key, roads);
  if (regionCache.size > REGION_CACHE_MAX) {
    const oldest = regionCache.keys().next().value;
    regionCache.delete(oldest);
  }
  logger.info("osm", `loaded ${roads.length} drivable roads for region ${key}`);
  return roads;
}
