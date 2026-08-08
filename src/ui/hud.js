// DOM-based HUD: speed, coordinates, road status, and a debug panel.
// Updated once per rendered frame; FPS is a rolling average.

import { localMetersToLatLng } from "../geo/coordinates.js";
import { toDegrees } from "../utils/math.js";

export class Hud {
  constructor(dom, world) {
    this.dom = dom;
    this.world = world;
    this.speedEl = dom.querySelector("#hud-speed");
    this.coordsEl = dom.querySelector("#hud-coords");
    this.statusEl = dom.querySelector("#hud-status");
    this.debugPanel = dom.querySelector("#hud-debug");
    this.warningEl = dom.querySelector("#hud-warning");
    this.debug = false;
    this.fps = 0;
    this._fpsAccum = 0;
    this._fpsFrames = 0;
  }

  setDebug(enabled) {
    this.debug = enabled;
    // On-road state and FPS are debug-only per spec (HUD section).
    this.statusEl.hidden = !enabled;
    this.debugPanel.hidden = !enabled;
  }

  showWarning(message) {
    this.warningEl.textContent = message;
    this.warningEl.hidden = false;
  }

  hideWarning() {
    this.warningEl.hidden = true;
  }

  update(player, roadResult, stats) {
    const kmh = Math.abs(player.speed) * 3.6;
    this.speedEl.textContent = Math.round(kmh);

    const geo = localMetersToLatLng(
      player.position.x,
      player.position.y,
      this.world.origin
    );
    this.coordsEl.textContent = `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`;

    this.statusEl.textContent = player.onRoad ? "ON ROAD" : "OFF ROAD";
    this.statusEl.classList.toggle("off-road", !player.onRoad);

    if (this.debug) {
      this.debugPanel.textContent = [
        `FPS ${this.fps.toFixed(0)}`,
        `KM/H ${kmh.toFixed(1)}  |  ${player.speed.toFixed(2)} m/s`,
        `STATUS ${player.onRoad ? "ON ROAD" : "OFF ROAD"}`,
        `HEADING ${toDegrees(player.heading).toFixed(1)} deg`,
        `POS ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)} m`,
        `GEO ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`,
        `CAM ${stats.camera.x.toFixed(1)}, ${stats.camera.y.toFixed(1)}`,
        `TILE ${stats.tile.x}, ${stats.tile.y} @ z${stats.tile.zoom}`,
        `TILES LOADED ${stats.tilesLoaded} (${stats.tilesFailed} failed)`,
        `ROAD SEGMENTS ${stats.segments} (cells ${stats.cells})`,
        `NEAREST ${roadResult?.road?.highway || "-"} @ ${roadResult ? roadResult.distance.toFixed(1) : "-"} m`,
        `ORIGIN ${this.world.origin.lat.toFixed(5)}, ${this.world.origin.lng.toFixed(5)}`,
        `BBOX ${stats.boundsLabel}`,
      ].join("\n");
    }
  }

  // Call once per frame with the frame time in seconds.
  onFrame(frameTime) {
    this._fpsAccum += frameTime;
    this._fpsFrames++;
    if (this._fpsAccum >= 0.5) {
      this.fps = this._fpsFrames / this._fpsAccum;
      this._fpsAccum = 0;
      this._fpsFrames = 0;
    }
  }
}
