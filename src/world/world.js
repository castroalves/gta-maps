// World owns the geographic origin, the loaded OSM bounds, and the
// road network. Loading order: resolve location -> set origin -> query
// OSM -> build local road geometry.

import { fetchRoads } from "./road-loader.js";
import { RoadNetwork } from "./road-network.js";
import { calculateBoundingBox } from "../geo/geometry.js";
import { latLngToLocalMeters } from "../geo/coordinates.js";
import { GAME_CONFIG } from "../config/game-config.js";
import { logger } from "../utils/logger.js";

export class World {
  constructor() {
    this.origin = null;
    this.location = null;
    this.bounds = null;
    this.roadNetwork = new RoadNetwork(GAME_CONFIG.spatialCellSize);
    this.loaded = false;
  }

  async load(location, onProgress) {
    this.location = location;
    this.origin = { lat: location.lat, lng: location.lng };
    this.bounds = calculateBoundingBox(
      location.lat,
      location.lng,
      GAME_CONFIG.worldLoadRadius
    );

    onProgress?.("Loading roads...");
    const roads = await fetchRoads(this.bounds);
    onProgress?.("Preparing world...");
    this.roadNetwork.build(roads, this.origin, this.bounds);
    this.loaded = true;
    logger.info(
      "game",
      `world ready: ${this.roadNetwork.segments.length} road segments`
    );
  }

  toLocal(lat, lng) {
    return latLngToLocalMeters(lat, lng, this.origin);
  }
}
