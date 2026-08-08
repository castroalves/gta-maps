// Renderer owns the canvas, DPR scaling, and the global draw order:
// map tiles -> debug geometry -> player vehicle.
// The HUD stays in the DOM; only world content is drawn on canvas.

import { MapRenderer } from "./map-renderer.js";
import { VehicleRenderer } from "./vehicle-renderer.js";
import { DebugRenderer } from "./debug-renderer.js";

export class Renderer {
  constructor(canvas, camera, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.camera = camera;
    this.world = world;
    this.mapRenderer = new MapRenderer(this.ctx, camera);
    this.vehicleRenderer = new VehicleRenderer(this.ctx);
    this.debugRenderer = new DebugRenderer(this.ctx, camera, world);
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.camera.setViewport(width, height);
  }

  render(alpha, player, debugEnabled) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Neutral fallback while tiles load / in the menu.
    ctx.fillStyle = "#1a1f1a";
    ctx.fillRect(0, 0, this.width, this.height);

    this.mapRenderer.render();
    if (debugEnabled) {
      this.debugRenderer.render(player, alpha);
    }
    if (player) {
      this.vehicleRenderer.render(player, alpha, this.camera);
    }
  }
}
