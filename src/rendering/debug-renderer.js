// Debug geometry: OSM road centerlines with estimated widths, spatial
// grid, nearest-road highlight, and the projection/distance line from
// the player. Rendered only when debug mode is enabled.

import { lerp } from "../utils/math.js";

const DEBUG_DRAW_RADIUS = 500; // meters around the camera

export class DebugRenderer {
  constructor(ctx, camera, world) {
    this.ctx = ctx;
    this.camera = camera;
    this.world = world;
    this.lastResult = null;
  }

  setRoadResult(result) {
    this.lastResult = result;
  }

  render(player, alpha) {
    const ctx = this.ctx;
    const camera = this.camera;
    const network = this.world.roadNetwork;
    if (!network) return;

    const px = player ? lerp(player.previousPosition.x, player.position.x, alpha) : camera.x;
    const py = player ? lerp(player.previousPosition.y, player.position.y, alpha) : camera.y;

    this.renderGrid(px, py);
    this.renderRoads(px, py);
    if (this.lastResult?.segment) {
      this.renderNearestRoad(px, py);
    }
  }

  renderGrid(px, py) {
    const ctx = this.ctx;
    const camera = this.camera;
    const cellSize = this.world.roadNetwork.spatialIndex.cellSize;
    const range = Math.ceil(camera.viewportWidth / 2 / camera.zoom / cellSize) + 1;
    const c0 = Math.floor(camera.x / cellSize);
    const r0 = Math.floor(camera.y / cellSize);

    ctx.strokeStyle = "rgba(80, 220, 120, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let cx = c0 - range; cx <= c0 + range; cx++) {
      for (let cy = r0 - range; cy <= r0 + range; cy++) {
        const s = camera.worldToScreen(cx * cellSize, cy * cellSize);
        const size = cellSize * camera.zoom;
        ctx.rect(s.x, s.y, size, size);
      }
    }
    ctx.stroke();
  }

  renderRoads(px, py) {
    const ctx = this.ctx;
    const camera = this.camera;
    const radius = DEBUG_DRAW_RADIUS;
    const radiusSq = radius * radius;

    ctx.lineCap = "round";
    for (const segment of this.world.roadNetwork.segments) {
      // Skip segments far from the player/camera.
      const cx = (segment.ax + segment.bx) / 2;
      const cy = (segment.ay + segment.by) / 2;
      const dx = cx - px;
      const dy = cy - py;
      if (dx * dx + dy * dy > radiusSq) continue;

      const a = camera.worldToScreen(segment.ax, segment.ay);
      const b = camera.worldToScreen(segment.bx, segment.by);
      ctx.strokeStyle = "rgba(255, 180, 60, 0.45)";
      ctx.lineWidth = Math.max(segment.width * camera.zoom, 1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Player marker.
    const s = camera.worldToScreen(px, py);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderNearestRoad(px, py) {
    const ctx = this.ctx;
    const camera = this.camera;
    const segment = this.lastResult.segment;

    const a = camera.worldToScreen(segment.ax, segment.ay);
    const b = camera.worldToScreen(segment.bx, segment.by);
    ctx.strokeStyle = "#ff3b30";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    if (this.lastResult.projection) {
      const p = this.lastResult.projection;
      const sp = camera.worldToScreen(p.x, p.y);
      const spp = camera.worldToScreen(px, py);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#ff3b30";
      ctx.beginPath();
      ctx.moveTo(spp.x, spp.y);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff3b30";
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
