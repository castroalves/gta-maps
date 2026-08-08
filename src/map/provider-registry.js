// Provider registry: maps provider ids to tile provider factories and
// user-facing labels. The game and menu only know ids/labels; all
// provider-specific URL logic lives inside each provider class.

import { MAP_CONFIG } from "../config/map-config.js";
import { OsmTileProvider } from "./osm-tile-provider.js";
import { GoogleTileProvider } from "./google-tile-provider.js";
import { EsriTileProvider } from "./esri-tile-provider.js";
import { CartoTileProvider } from "./carto-tile-provider.js";
import { StadiaTileProvider } from "./stadia-tile-provider.js";

const PROVIDERS = {
  osm: { label: "OpenStreetMap", create: () => new OsmTileProvider() },
  "esri-streets": {
    label: "Esri Streets",
    create: () => new EsriTileProvider("World_Street_Map"),
  },
  "esri-topo": {
    label: "Esri Topo",
    create: () => new EsriTileProvider("World_Topo_Map"),
  },
  "esri-satellite": {
    label: "Esri Satellite",
    create: () => new EsriTileProvider("World_Imagery"),
  },
  "carto-voyager": {
    label: "Carto Voyager",
    create: () => new CartoTileProvider("rastertiles/voyager"),
  },
  "carto-dark": {
    label: "Carto Dark",
    create: () => new CartoTileProvider("dark_all"),
  },
  "carto-light": {
    label: "Carto Light",
    create: () => new CartoTileProvider("light_all"),
  },
  stadia: {
    label: "Stadia Maps (key)",
    create: () => new StadiaTileProvider("alidade_smooth"),
  },
  google: { label: "Google Maps", create: () => new GoogleTileProvider() },
};

export function createTileProvider(name) {
  const entry = PROVIDERS[name];
  if (!entry) {
    throw new Error(`Unknown tile provider: ${name}`);
  }
  return entry.create();
}

// Menu options. Stadia only appears once a key is configured, since
// its tiles return 401 without one.
export function getProviderOptions() {
  return Object.entries(PROVIDERS)
    .filter(([id]) => id !== "stadia" || MAP_CONFIG.stadiaApiKey)
    .map(([id, entry]) => ({ id, label: entry.label }));
}
