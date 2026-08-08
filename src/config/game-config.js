// Central tunables. No magic numbers scattered through the codebase.

export const GAME_CONFIG = {
  physicsHz: 60,

  // Radius of the OSM world loaded around the spawn point.
  worldLoadRadius: 1500,

  // Radius used when searching for the nearest road near the player.
  roadSearchRadius: 50,

  spatialCellSize: 100,

  pixelsPerMeter: 4,

  tileZoom: 18,

  cameraFollowSpeed: 8,

  // Seconds of velocity look-ahead for the camera (0 disables it).
  cameraLookAhead: 0.35,

  maxFrameTime: 0.25,

  maxSpawnSearchDistance: 500,

  onRoadTolerance: 1.5,

  maxTileCacheSize: 200,
};
