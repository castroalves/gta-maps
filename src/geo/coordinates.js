// Coordinate system conversions between the three spaces used by the
// game: geographic (lat/lng), local world (meters from world origin),
// and slippy-map tile coordinates.
//
// Local Y is negated so that north renders upward on screen-style
// coordinates. All gameplay physics run in local meters only.

import { latLngToMercator, mercatorToLatLng } from "./mercator.js";

export function latLngToLocalMeters(lat, lng, origin) {
  const m = latLngToMercator(lat, lng);
  const o = latLngToMercator(origin.lat, origin.lng);
  return { x: m.x - o.x, y: -(m.y - o.y) };
}

export function localMetersToLatLng(x, y, origin) {
  const o = latLngToMercator(origin.lat, origin.lng);
  return mercatorToLatLng(o.x + x, o.y - y);
}

// Standard Web Mercator slippy-map tile coordinates.
export function latLngToTileCoordinate(lat, lng, zoom) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { x, y, zoom };
}

// Geographic coordinates of a tile's top-left corner.
export function tileCoordinateToLatLng(tileX, tileY, zoom) {
  const n = 2 ** zoom;
  const lng = (tileX / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}
