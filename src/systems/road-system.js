// RoadSystem answers "is the vehicle on a road?" by querying the
// spatial index around the vehicle and comparing the distance to the
// nearest centerline against the road half-width plus tolerance.

import { GAME_CONFIG } from "../config/game-config.js";

export class RoadSystem {
  constructor(world) {
    this.world = world;
    this.lastResult = {
      onRoad: false,
      distance: Infinity,
      segment: null,
      road: null,
      projection: null,
    };
  }

  update(vehicle) {
    const result = this.world.roadNetwork.nearestRoad(
      vehicle.position.x,
      vehicle.position.y,
      GAME_CONFIG.roadSearchRadius
    );
    if (!result) {
      vehicle.onRoad = false;
      this.lastResult.onRoad = false;
      this.lastResult.distance = Infinity;
      this.lastResult.segment = null;
      this.lastResult.road = null;
      this.lastResult.projection = null;
      return this.lastResult;
    }
    const tolerance = result.segment.width / 2 + GAME_CONFIG.onRoadTolerance;
    const onRoad = result.distance <= tolerance;
    vehicle.onRoad = onRoad;
    this.lastResult.onRoad = onRoad;
    this.lastResult.distance = result.distance;
    this.lastResult.segment = result.segment;
    this.lastResult.road = result.road;
    this.lastResult.projection = result.projection;
    return this.lastResult;
  }
}
