// CARTO basemap tile provider (free, keyless for light usage, CORS).

import { TileProvider } from "./tile-provider.js";
import { MAP_CONFIG } from "../config/map-config.js";

export class CartoTileProvider extends TileProvider {
  constructor(style) {
    super();
    // e.g. "rastertiles/voyager", "dark_all", "light_all"
    this.style = style;
  }

  getTileUrl({ x, y, zoom }) {
    return `https://a.basemaps.cartocdn.com/${this.style}/${zoom}/${x}/${y}.png`;
  }

  getAttribution() {
    return MAP_CONFIG.attribution.carto;
  }
}
