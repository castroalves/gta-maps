// SpawnSystem places the player on a real road: find the nearest valid
// road segment to the requested point, project onto it, and derive the
// initial heading from the segment direction.

import { GAME_CONFIG } from "../config/game-config.js";
import { latLngToLocalMeters } from "../geo/coordinates.js";
import { logger } from "../utils/logger.js";

export class SpawnSystem {
  constructor(world) {
    this.world = world;
  }

  findSpawn(lat, lng) {
    const network = this.world.roadNetwork;
    const local = latLngToLocalMeters(lat, lng, this.world.origin);
    const nearest = network.nearestRoad(local.x, local.y, GAME_CONFIG.maxSpawnSearchDistance);
    if (!nearest) {
      throw new Error(
        `No drivable road within ${GAME_CONFIG.maxSpawnSearchDistance} m of the requested point.`
      );
    }
    const p = nearest.projection;
    const heading = segmentHeading(nearest.segment);
    logger.info(
      "game",
      `spawn on ${nearest.road.highway} road, ${nearest.distance.toFixed(1)} m from requested point`
    );
    return { x: p.x, y: p.y, heading };
  }
}

// Segment direction vector is (dx, dy); forward is (sin h, -cos h),
// so h = atan2(dx, -dy).
function segmentHeading(segment) {
  const dx = segment.bx - segment.ax;
  const dy = segment.by - segment.ay;
  return Math.atan2(dx, -dy);
}
