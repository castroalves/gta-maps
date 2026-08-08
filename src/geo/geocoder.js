// Location input handling: coordinate parsing and place search via
// Nominatim (the OSM geocoder). No game logic knows about this.

import { OSM_CONFIG } from "../config/map-config.js";
import { clampLatitude } from "./geometry.js";
import { logger } from "../utils/logger.js";

// Accepts "38.7223,-9.1393" (comma, semicolon or space separated).
// Returns { label, lat, lng } or null when not parseable.
export function parseCoordinateInput(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  const match = trimmed.match(
    /^([+-]?\d+(?:\.\d+)?)\s*[,; ]\s*([+-]?\d+(?:\.\d+)?)$/
  );
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat: clampLatitude(lat),
    lng,
  };
}

// Place / address search. Returns { label, lat, lng }.
export async function searchPlace(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    "accept-language": "en",
  });
  const url = `${OSM_CONFIG.nominatimEndpoint}?${params.toString()}`;
  logger.info("geo", "geocoding:", query);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoder returned HTTP ${response.status}`);
  }
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error("No results found for query");
  }
  const first = results[0];
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Geocoder returned invalid coordinates");
  }
  const label = typeof first.display_name === "string" ? first.display_name : query;
  return { label, lat: clampLatitude(lat), lng };
}
