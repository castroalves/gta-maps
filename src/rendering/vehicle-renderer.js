// Procedural retro car drawn with canvas primitives: hard shadow,
// body, windshield, rear window, front indicators. The vehicle is
// drawn facing -Y locally so ctx.rotate(heading) keeps the nose
// pointing along the velocity direction (north at heading 0).

import { lerp, lerpAngle } from "../utils/math.js";

export class VehicleRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  render(vehicle, alpha, camera) {
    const ctx = this.ctx;
    const x = lerp(vehicle.previousPosition.x, vehicle.position.x, alpha);
    const y = lerp(vehicle.previousPosition.y, vehicle.position.y, alpha);
    const heading = lerpAngle(vehicle.previousHeading, vehicle.heading, alpha);
    const screen = camera.worldToScreen(x, y);

    const lengthPx = vehicle.config.length * camera.zoom;
    const widthPx = vehicle.config.width * camera.zoom;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(heading);

    // Hard offset shadow.
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(-widthPx / 2 + 2, -lengthPx / 2 + 3, widthPx, lengthPx);

    // Body (front faces -Y local).
    ctx.fillStyle = "#e8442e";
    ctx.fillRect(-widthPx / 2, -lengthPx / 2, widthPx, lengthPx);

    // Hood stripe.
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(-widthPx * 0.16, -lengthPx / 2, widthPx * 0.32, lengthPx);

    // Windshield.
    ctx.fillStyle = "#a8ddf2";
    ctx.fillRect(-widthPx * 0.28, -lengthPx * 0.18, widthPx * 0.56, lengthPx * 0.26);

    // Rear window.
    ctx.fillStyle = "#a8ddf2";
    ctx.fillRect(-widthPx * 0.28, lengthPx * 0.24, widthPx * 0.56, lengthPx * 0.12);

    // Front indicators.
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(-widthPx / 2, -lengthPx / 2, widthPx * 0.35, 2);
    ctx.fillRect(widthPx / 2 - widthPx * 0.35, -lengthPx / 2, widthPx * 0.35, 2);

    ctx.restore();
  }
}
