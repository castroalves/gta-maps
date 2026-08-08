// Esri ArcGIS raster tile provider (free, keyless, CORS-enabled).
//
// NOTE: Esri serves tiles in z/y/x order (row-major), unlike the
// standard slippy-map z/x/y convention used by OSM tiles.

import { TileProvider } from "./tile-provider.js";
import { MAP_CONFIG } from "../config/map-config.js";

export class EsriTileProvider extends TileProvider {
  constructor(layer) {
    super();
    // e.g. "World_Street_Map", "World_Imagery", "World_Topo_Map"
    this.layer = layer;
  }

  getTileUrl({ x, y, zoom }) {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/${this.layer}/MapServer/tile/${zoom}/${y}/${x}`;
  }

  getAttribution() {
    return MAP_CONFIG.attribution.esri;
  }
}
