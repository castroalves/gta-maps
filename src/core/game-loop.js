// Fixed-timestep game loop with an accumulator and render
// interpolation. Physics always advances in fixed steps regardless of
// monitor refresh rate, so behavior is equivalent at 30/60/120 Hz.

import { GAME_CONFIG } from "../config/game-config.js";

export class GameLoop {
  constructor(game) {
    this.game = game;
    this.fixedDt = 1 / GAME_CONFIG.physicsHz;
    this.maxStepsPerFrame = 5;
    this.running = false;
    this.rafId = 0;
    this.previousTime = 0;
    this.accumulator = 0;
    this.frame = this.frame.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.previousTime = performance.now();
    this.accumulator = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  frame(now) {
    if (!this.running) return;
    let frameTime = (now - this.previousTime) / 1000;
    this.previousTime = now;
    frameTime = Math.min(frameTime, GAME_CONFIG.maxFrameTime);
    this.accumulator += frameTime;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxStepsPerFrame) {
      this.game.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }
    // Avoid a spiral of death after a long stall (e.g. tab switch).
    if (steps === this.maxStepsPerFrame && this.accumulator >= this.fixedDt) {
      this.accumulator = 0;
    }

    const alpha = this.accumulator / this.fixedDt;
    this.game.render(alpha, frameTime);
    this.rafId = requestAnimationFrame(this.frame);
  }
}
