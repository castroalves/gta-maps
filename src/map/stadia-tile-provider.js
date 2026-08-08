// Stadia Maps tile provider (free tier requires a key, CORS).
// Get a key at https://cloud.stadiamaps.com (no card required).

import { TileProvider } from "./tile-provider.js";
import { MAP_CONFIG } from "../config/map-config.js";

export class StadiaTileProvider extends TileProvider {
  constructor(style) {
    super();
    // e.g. "alidade_smooth", "outdoors", "osm_bright"
    this.style = style;
  }

  getTileUrl({ x, y, zoom }) {
    const key = MAP_CONFIG.stadiaApiKey;
    if (!key) {
      throw new Error("Stadia tile provider requires MAP_CONFIG.stadiaApiKey");
    }
    return `https://tiles.stadiamaps.com/tiles/${this.style}/${zoom}/${x}/${y}.png?api_key=${key}`;
  }

  getAttribution() {
    return MAP_CONFIG.attribution.stadia;
  }
}
