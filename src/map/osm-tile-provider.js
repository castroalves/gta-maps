// OpenStreetMap raster tile provider (standard slippy-map URLs).

import { TileProvider } from "./tile-provider.js";
import { MAP_CONFIG } from "../config/map-config.js";

export class OsmTileProvider extends TileProvider {
  getTileUrl({ x, y, zoom }) {
    return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }

  getAttribution() {
    return MAP_CONFIG.attribution.osm;
  }
}
