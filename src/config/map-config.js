// Map provider configuration. Switching providers is a config change
// plus a provider implementation; nothing else in the engine cares.

export const MAP_CONFIG = {
  // "osm" uses OpenStreetMap raster tiles (no key required).
  // "google" requires a browser API key and a Google Maps account.
  provider: "osm",

  googleApiKey: "",

  tileZoom: 18,

  tileSize: 256,

  // OSM tiles send CORS headers, which keeps the canvas untainted.
  crossOrigin: true,

  attribution: {
    osm: "© OpenStreetMap contributors",
    google: "Map data © Google",
  },
};

export const OSM_CONFIG = {
  overpassEndpoint: "https://overpass-api.de/api/interpreter",
  nominatimEndpoint: "https://nominatim.openstreetmap.org/search",
};

// Estimated road width in meters per highway type, used when OSM does
// not provide explicit width or lane data.
export const ROAD_TYPES = {
  motorway: 14,
  trunk: 12,
  primary: 11,
  secondary: 10,
  tertiary: 9,
  unclassified: 7,
  residential: 7,
  service: 5,
  living_street: 6,
};

// Highway values treated as drivable for gameplay.
export const DRIVABLE_HIGHWAY_RE =
  /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)$/;
