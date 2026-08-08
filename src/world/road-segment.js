// A road segment is a single straight piece of a road polyline, in
// local world meters. It is the atomic unit for nearest-road queries,
// on-road detection, spawn placement, and (later) traffic following.

export function createRoadSegment(roadId, type, width, ax, ay, bx, by) {
  return { roadId, type, width, ax, ay, bx, by };
}

// Heading of a segment's travel direction. Segment direction is (dx, dy);
// forward is (sin h, -cos h), so h = atan2(dx, -dy).
export function segmentHeading(segment) {
  return Math.atan2(segment.bx - segment.ax, -(segment.by - segment.ay));
}
