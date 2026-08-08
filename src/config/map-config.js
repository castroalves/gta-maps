// Map provider configuration. Switching providers is a config change
// plus a provider implementation; nothing else in the engine cares.

export const MAP_CONFIG = {
  // Default provider id (see src/map/provider-registry.js for all
  // options). The menu lets the player override this per session.
  provider: "osm",

  googleApiKey: "",

  // Free-tier key for the Stadia Maps provider (optional).
  // Get one at https://cloud.stadiamaps.com — no card required.
  stadiaApiKey: "",

  tileZoom: 18,

  tileSize: 256,

  // All bundled providers send CORS headers, which keeps the canvas
  // untainted. Set false for a provider without CORS support.
  crossOrigin: true,

  attribution: {
    osm: "© OpenStreetMap contributors",
    google: "Map data © Google",
    esri: "© Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    carto: "© OpenStreetMap contributors © CARTO",
    stadia: "© Stadia Maps © OpenMapTiles © OpenStreetMap contributors",
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
