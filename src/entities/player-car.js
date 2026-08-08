// PlayerCar translates raw keyboard state into control signals. It
// never touches the DOM; physics reads the resulting signals during
// fixed-timestep updates.

import { Vehicle, VEHICLE_CONFIG } from "./vehicle.js";

export class PlayerCar extends Vehicle {
  constructor() {
    super(VEHICLE_CONFIG);
    this.name = "Player";
  }

  interpretInput(input) {
    this.throttle = input.accelerate ? 1 : 0;
    this.brakeInput = input.brake;
    this.handbrake = input.handbrake;
    this.steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  }
}
