// Pure geometric functions. No DOM, no state — unit-testable.

export const EARTH_RADIUS = 6378137;

// Shortest distance from point P to the finite segment AB.
export function distancePointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Closest point on segment AB to point P, plus its parameter t in [0,1].
export function projectPointOntoSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return { x: ax, y: ay, t: 0 };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return { x: ax + t * dx, y: ay + t * dy, t };
}

// Bounding box around a point for a given radius in meters.
// Equirectangular approximation is sufficient for sizing OSM queries.
export function calculateBoundingBox(lat, lng, radiusMeters) {
  const dLat = (radiusMeters / EARTH_RADIUS) * (180 / Math.PI);
  const dLng =
    (radiusMeters / (EARTH_RADIUS * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
  return {
    south: lat - dLat,
    west: lng - dLng,
    north: lat + dLat,
    east: lng + dLng,
  };
}

// Web Mercator safe latitude range (the projection is singular beyond it).
export function clampLatitude(lat) {
  return Math.max(-85.05112878, Math.min(85.05112878, lat));
}
