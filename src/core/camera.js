// Camera converts local world meters to screen pixels. It smooths
// toward the player with a small velocity look-ahead; north always
// stays up (no rotation in the MVP).

import { GAME_CONFIG } from "../config/game-config.js";

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = GAME_CONFIG.pixelsPerMeter;
    this.followSpeed = GAME_CONFIG.cameraFollowSpeed;
    this.lookAhead = GAME_CONFIG.cameraLookAhead;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  // Exponential smoothing is frame-rate independent.
  update(dt, target, velocityX = 0, velocityY = 0) {
    const tx = target.x + velocityX * this.lookAhead;
    const ty = target.y + velocityY * this.lookAhead;
    const k = 1 - Math.exp(-this.followSpeed * dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  worldToScreen(wx, wy) {
    return {
      x: this.viewportWidth / 2 + (wx - this.x) * this.zoom,
      y: this.viewportHeight / 2 + (wy - this.y) * this.zoom,
    };
  }
}
