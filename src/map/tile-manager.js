// TileManager computes the visible tile range from the camera viewport,
// streams missing tiles asynchronously, keeps an LRU cache, and exposes
// per-tile screen placement for the renderer. Tile loading never blocks
// physics; missing tiles render as a neutral fallback color.

import { TileCache } from "./tile-cache.js";
import {
  latLngToLocalMeters,
  localMetersToLatLng,
  latLngToTileCoordinate,
  tileCoordinateToLatLng,
} from "../geo/coordinates.js";
import { EARTH_RADIUS } from "../geo/mercator.js";
import { logger } from "../utils/logger.js";

const TILE_PIXELS = 256;

async function loadBitmap(url, crossOrigin) {
  const response = await fetch(url, crossOrigin ? { mode: "cors" } : undefined);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const blob = await response.blob();
  // createImageBitmap is preferred; fall back to an <img> on older engines.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = URL.createObjectURL(blob);
  });
}

export class TileManager {
  constructor(provider, zoom, maxCacheSize = 200, crossOrigin = true) {
    this.provider = provider;
    this.zoom = zoom;
    this.cache = new TileCache(maxCacheSize);
    this.pending = new Map(); // key -> promise (deduplicates requests)
    this.visibleTiles = [];
    this.origin = null;
    // Horizontal world width of one tile in meters at this zoom.
    this.tileWorldSize = (2 * Math.PI * EARTH_RADIUS) / 2 ** zoom;
    this.stats = { loadedTiles: 0, failedTiles: 0 };
    this.crossOrigin = crossOrigin;
  }

  setOrigin(origin) {
    this.origin = origin;
  }

  // viewport: { centerX, centerY, halfWidthMeters, halfHeightMeters }
  update(viewport) {
    if (!this.origin) return;
    // One-tile overscan prevents blank edges while the camera moves.
    const halfW = viewport.halfWidthMeters + this.tileWorldSize;
    const halfH = viewport.halfHeightMeters + this.tileWorldSize;

    const topLeft = localMetersToLatLng(
      viewport.centerX - halfW,
      viewport.centerY - halfH,
      this.origin
    );
    const bottomRight = localMetersToLatLng(
      viewport.centerX + halfW,
      viewport.centerY + halfH,
      this.origin
    );
    const t1 = latLngToTileCoordinate(topLeft.lat, topLeft.lng, this.zoom);
    const t2 = latLngToTileCoordinate(bottomRight.lat, bottomRight.lng, this.zoom);
    const minX = Math.min(t1.x, t2.x);
    const maxX = Math.max(t1.x, t2.x);
    const minY = Math.min(t1.y, t2.y);
    const maxY = Math.max(t1.y, t2.y);
    const n = 2 ** this.zoom;

    const tiles = [];
    for (let ty = minY; ty <= maxY; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = minX; tx <= maxX; tx++) {
        if (tx < 0 || tx >= n) continue;
        const key = `${this.zoom}/${tx}/${ty}`;
        const entry = this.cache.get(key);
        const screen = this.computeTileScreen(tx, ty);
        if (entry && entry.status === "ready") {
          tiles.push({ key, x: tx, y: ty, image: entry.image, ...screen });
        } else {
          tiles.push({ key, x: tx, y: ty, image: null, ...screen });
          this.requestTile(tx, ty, key);
        }
      }
    }
    this.visibleTiles = tiles;
  }

  // World-space position of a tile's top-left corner; the renderer
  // converts it to screen space through the camera each frame.
  computeTileScreen(tx, ty) {
    const corner = tileCoordinateToLatLng(tx, ty, this.zoom);
    const local = latLngToLocalMeters(corner.lat, corner.lng, this.origin);
    return { screenX: local.x, screenY: local.y, size: this.tileWorldSize };
  }

  requestTile(tx, ty, key) {
    if (this.pending.has(key)) return;
    const url = this.provider.getTileUrl({ x: tx, y: ty, zoom: this.zoom });
    const promise = loadBitmap(url, this.crossOrigin)
      .then((image) => {
        this.cache.set(key, { image, status: "ready" });
        this.stats.loadedTiles++;
        this.pending.delete(key);
      })
      .catch((error) => {
        logger.warn("map", "tile load failed:", key, error.message);
        this.stats.failedTiles++;
        this.pending.delete(key);
      });
    this.pending.set(key, promise);
  }
}
