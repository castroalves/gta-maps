// Google Maps Map Tiles API provider (stub).
//
// Isolated entirely inside this module so the engine never depends on
// Google-specific behavior. The real API needs a session token, which
// requires a keyed POST to the session endpoint:
//
//   POST https://tile.googleapis.com/v1/create_session
//   body: { mapType: "roadmap", language: "en-US", region: "US" }
//
// then tiles come from
// https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=...
//
// This stub throws when used without a configured key; the game runs
// with the OSM provider by default.

import { TileProvider } from "./tile-provider.js";
import { MAP_CONFIG } from "../config/map-config.js";

export class GoogleTileProvider extends TileProvider {
  constructor() {
    super();
    this.apiKey = MAP_CONFIG.googleApiKey;
    this.session = null;
  }

  getTileUrl({ x, y, zoom }) {
    if (!this.apiKey) {
      throw new Error("Google tile provider requires MAP_CONFIG.googleApiKey");
    }
    if (!this.session) {
      throw new Error(
        "Google tile provider needs a session token (see module comment)"
      );
    }
    return `https://tile.googleapis.com/v1/2dtiles/${zoom}/${x}/${y}?session=${this.session}`;
  }

  getAttribution() {
    return MAP_CONFIG.attribution.google;
  }
}
