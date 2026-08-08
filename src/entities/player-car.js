// PlayerCar translates raw input (keyboard + touch) into control
// signals. The auto-drive assist value is blended in: manual steering
// fades the assist out, so the player always wins while steering.

import { Vehicle, VEHICLE_CONFIG } from "./vehicle.js";
import { clamp } from "../utils/math.js";
import { GAME_CONFIG } from "../config/game-config.js";

export class PlayerCar extends Vehicle {
  constructor() {
    super(VEHICLE_CONFIG);
    this.name = "Player";
  }

  interpretInput(input, assistSteer = 0) {
    this.throttle = input.accelerate ? 1 : 0;
    this.brakeInput = input.brake;
    this.handbrake = input.handbrake;
    const manual = input.steer || 0;
    const fade = 1 - Math.min(Math.abs(manual), 1);
    this.steerInput = clamp(
      manual + assistSteer * fade * GAME_CONFIG.autoDriveStrength,
      -1,
      1
    );
  }
}
