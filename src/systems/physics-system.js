// Arcade car physics. Not a rigid-body simulation — a tuned kinematic
// model that is responsive and fun with keyboard input.
//
// All simulation happens in local meters with a fixed timestep; the
// renderer interpolates between previous and current state.

import { clamp } from "../utils/math.js";

export class PhysicsSystem {
  update(vehicle, dt) {
    const cfg = vehicle.config;
    const onRoad = vehicle.onRoad;

    const maxSpeed = cfg.maxForwardSpeed * (onRoad ? 1 : cfg.offRoadSpeedMultiplier);
    const accel = cfg.acceleration * (onRoad ? 1 : cfg.offRoadAccelerationMultiplier);
    const maxReverse = cfg.maxReverseSpeed;

    vehicle.previousPosition.x = vehicle.position.x;
    vehicle.previousPosition.y = vehicle.position.y;
    vehicle.previousHeading = vehicle.heading;

    // Longitudinal forces.
    if (vehicle.throttle > 0) {
      if (vehicle.speed >= 0) {
        vehicle.speed += accel * vehicle.throttle * dt;
      } else {
        vehicle.speed += cfg.braking * dt; // braking out of reverse
      }
    } else if (vehicle.brakeInput) {
      if (vehicle.speed > 0.05) {
        vehicle.speed -= cfg.braking * dt;
      } else {
        vehicle.speed -= cfg.reverseAcceleration * dt;
      }
    } else {
      // Coasting: rolling resistance + quadratic aerodynamic drag.
      vehicle.speed -= cfg.rollingResistance * Math.sign(vehicle.speed) * dt;
      vehicle.speed -= cfg.aerodynamicDrag * vehicle.speed * Math.abs(vehicle.speed) * dt;
    }

    vehicle.speed = clamp(vehicle.speed, -maxReverse, maxSpeed);
    if (Math.abs(vehicle.speed) < 0.05 && vehicle.throttle === 0 && !vehicle.brakeInput) {
      vehicle.speed = 0;
    }

    // Steering effectiveness scales with speed; handbrake sharpens it.
    const speedRatio = Math.min(Math.abs(vehicle.speed) / 10, 1);
    const steerSign = Math.sign(vehicle.speed || 1);
    let rate = cfg.steeringRate;
    if (vehicle.handbrake) rate *= cfg.handbrakeTurnMultiplier;
    vehicle.steering = vehicle.steerInput;
    vehicle.heading += vehicle.steerInput * rate * speedRatio * steerSign * dt;

    // Integrate position. Heading 0 faces north (negative Y).
    vehicle.position.x += Math.sin(vehicle.heading) * vehicle.speed * dt;
    vehicle.position.y -= Math.cos(vehicle.heading) * vehicle.speed * dt;
  }
}
