// Vehicle simulation state and tuning. All values are in local meters,
// seconds, and radians. previousPosition/previousHeading feed render
// interpolation so motion stays smooth at any monitor refresh rate.

import { Entity } from "./entity.js";

export const VEHICLE_CONFIG = {
  maxForwardSpeed: 42, // ~151 km/h
  maxReverseSpeed: 10,

  acceleration: 16,
  reverseAcceleration: 8,
  braking: 28,

  rollingResistance: 1.5,
  aerodynamicDrag: 0.015,

  steeringRate: 2.4,
  steeringResponse: 5,

  offRoadSpeedMultiplier: 0.55,
  offRoadAccelerationMultiplier: 0.45,

  handbrakeTurnMultiplier: 1.8,

  // Visual dimensions in meters (procedural rendering).
  length: 4.6,
  width: 2.0,
};

export class Vehicle extends Entity {
  constructor(config = VEHICLE_CONFIG) {
    super();
    this.config = config;
    this.position = { x: 0, y: 0 };
    this.previousPosition = { x: 0, y: 0 };
    this.heading = 0;
    this.previousHeading = 0;
    this.speed = 0;

    // Control signals derived from input by the vehicle subclass.
    this.throttle = 0;
    this.brakeInput = false;
    this.handbrake = false;
    this.steerInput = 0;

    this.onRoad = true;
  }

  snapPosition(x, y, heading) {
    this.position.x = x;
    this.position.y = y;
    this.previousPosition.x = x;
    this.previousPosition.y = y;
    this.heading = heading;
    this.previousHeading = heading;
    this.speed = 0;
  }
}
