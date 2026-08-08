// Web Mercator (EPSG:3857) helpers.
//
// Map tile servers (OSM, Google) project imagery with Web Mercator.
// Local gameplay coordinates are therefore derived from Mercator
// meters rather than a plain equirectangular approximation, so OSM
// road geometry lines up exactly with the tile imagery underneath.

import { clamp } from "../utils/math.js";

export const EARTH_RADIUS = 6378137;
export const MERCATOR_MAX_LATITUDE = 85.05112878;

export function latLngToMercator(lat, lng) {
  const latRad = clamp(lat, -MERCATOR_MAX_LATITUDE, MERCATOR_MAX_LATITUDE) * (Math.PI / 180);
  return {
    x: EARTH_RADIUS * lng * (Math.PI / 180),
    y: EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2)),
  };
}

export function mercatorToLatLng(x, y) {
  return {
    lng: (x / EARTH_RADIUS) * (180 / Math.PI),
    lat: (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI),
  };
}
