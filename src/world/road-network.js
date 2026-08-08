// RoadNetwork owns normalized gameplay geometry: roads converted to
// local meters, estimated widths, and the spatial index of segments.

import { latLngToLocalMeters } from "../geo/coordinates.js";
import { createRoadSegment } from "./road-segment.js";
import { SpatialIndex } from "./spatial-index.js";
import { estimateRoadWidth } from "./road-loader.js";
import { ROAD_TYPES } from "../config/map-config.js";
import {
  distancePointToSegment,
  projectPointOntoSegment,
} from "../geo/geometry.js";

export class RoadNetwork {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.origin = null;
    this.bounds = null;
    this.roads = [];
    this.segments = [];
    this.byId = new Map();
    this.spatialIndex = new SpatialIndex(cellSize);
  }

  build(roads, origin, bounds) {
    this.origin = origin;
    this.bounds = bounds;
    this.roads = roads;
    this.segments = [];
    this.byId = new Map();
    this.spatialIndex = new SpatialIndex(this.cellSize);

    for (const road of roads) {
      const localPoints = road.points.map((p) =>
        latLngToLocalMeters(p.lat, p.lng, origin)
      );
      const width = estimateRoadWidth(road, ROAD_TYPES);
      const normalized = { ...road, localPoints, width };
      this.byId.set(road.id, normalized);
      for (let i = 0; i < localPoints.length - 1; i++) {
        const a = localPoints[i];
        const b = localPoints[i + 1];
        const segment = createRoadSegment(
          road.id,
          road.highway,
          width,
          a.x,
          a.y,
          b.x,
          b.y
        );
        this.segments.push(segment);
        this.spatialIndex.insert(segment);
      }
    }
  }

  // Nearest road segment to a local point, or null when nothing is
  // within the search radius. Includes the projected point and distance.
  nearestRoad(x, y, searchRadius) {
    const candidates = this.spatialIndex.query(x, y, searchRadius);
    let best = null;
    let bestDistance = Infinity;
    for (const segment of candidates) {
      const d = distancePointToSegment(x, y, segment.ax, segment.ay, segment.bx, segment.by);
      if (d < bestDistance) {
        bestDistance = d;
        best = segment;
      }
    }
    if (!best) return null;
    const projection = projectPointOntoSegment(x, y, best.ax, best.ay, best.bx, best.by);
    return {
      segment: best,
      road: this.byId.get(best.roadId),
      distance: bestDistance,
      projection,
    };
  }

  // True when the local point lies inside the loaded OSM bounds, with
  // an optional margin in meters.
  isInsideBounds(x, y, margin = 0) {
    if (!this.bounds || !this.origin) return true;
    const { south, west, north, east } = this.bounds;
    const topLeft = latLngToLocalMeters(north, west, this.origin);
    const bottomRight = latLngToLocalMeters(south, east, this.origin);
    const minX = Math.min(topLeft.x, bottomRight.x) - margin;
    const maxX = Math.max(topLeft.x, bottomRight.x) + margin;
    const minY = Math.min(topLeft.y, bottomRight.y) - margin;
    const maxY = Math.max(topLeft.y, bottomRight.y) + margin;
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
}
