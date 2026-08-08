// MVP collision handling: softly nudge the vehicle back toward the
// loaded world area once it drifts past the bounds. Real vehicle
// collisions arrive in a later milestone.

import { logger } from "../utils/logger.js";

const BOUNDS_MARGIN = 60; // meters of grace beyond loaded road data

export class CollisionSystem {
  constructor(world) {
    this.world = world;
    this.lastWarned = 0;
  }

  update(vehicle) {
    if (!this.world.bounds) return;
    if (
      this.world.roadNetwork.isInsideBounds(
        vehicle.position.x,
        vehicle.position.y,
        BOUNDS_MARGIN
      )
    ) {
      return;
    }
    // Soft clamp: pull toward the origin (near the loaded area center)
    // and bleed speed so the player can turn around easily.
    vehicle.position.x *= 0.995;
    vehicle.position.y *= 0.995;
    vehicle.speed *= 0.98;
    const now = performance.now();
    if (now - this.lastWarned > 4000) {
      this.lastWarned = now;
      logger.warn("game", "player left the loaded world area");
    }
  }
}
