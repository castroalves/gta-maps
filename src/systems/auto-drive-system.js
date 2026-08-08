// Road-following assist ("TouchDrive" mode, Asphalt-style).
//
// Steers toward the direction of the best-aligned road segment ahead
// of the vehicle, so the car follows streets on its own. The player's
// manual steering is blended on top by PlayerCar and wins while they
// are actively steering.

import { GAME_CONFIG } from "../config/game-config.js";
import { clamp, angleDiff } from "../utils/math.js";
import { segmentHeading } from "../world/road-segment.js";

export class AutoDriveSystem {
  constructor(world) {
    this.world = world;
    this.enabled = true;
  }

  // Returns a steering value in [-1, 1]: 0 when aligned with the road.
  steer(vehicle) {
    const segment = this.world.roadNetwork.bestRoadAhead(
      vehicle.position.x,
      vehicle.position.y,
      vehicle.heading,
      GAME_CONFIG.autoDriveRadius
    );
    if (!segment) return 0;

    let target = segmentHeading(segment);
    // Pick the orientation closest to the current heading (no 180 flips).
    const flip = target + Math.PI;
    if (Math.abs(angleDiff(flip, vehicle.heading)) < Math.abs(angleDiff(target, vehicle.heading))) {
      target = flip;
    }
    return clamp(angleDiff(target, vehicle.heading) * GAME_CONFIG.autoDriveGain, -1, 1);
  }
}
