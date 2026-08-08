// Game owns the application lifecycle and top-level state machine.
// It wires the world, tile manager, systems, renderer, HUD and menu
// together but delegates each responsibility to its own module.

import { GAME_CONFIG } from "../config/game-config.js";
import { MAP_CONFIG } from "../config/map-config.js";
import { Input } from "./input.js";
import { TouchControls } from "./touch-controls.js";
import { Camera } from "./camera.js";
import { GameLoop } from "./game-loop.js";
import { EventBus } from "./event-bus.js";
import { Renderer } from "../rendering/renderer.js";
import { TileManager } from "../map/tile-manager.js";
import { createTileProvider } from "../map/provider-registry.js";
import { World } from "../world/world.js";
import { PlayerCar } from "../entities/player-car.js";
import { PhysicsSystem } from "../systems/physics-system.js";
import { RoadSystem } from "../systems/road-system.js";
import { AutoDriveSystem } from "../systems/auto-drive-system.js";
import { SpawnSystem } from "../systems/spawn-system.js";
import { CollisionSystem } from "../systems/collision-system.js";
import { Menu } from "../ui/menu.js";
import { Hud } from "../ui/hud.js";
import {
  localMetersToLatLng,
  latLngToTileCoordinate,
} from "../geo/coordinates.js";
import { logger } from "../utils/logger.js";

export const GameState = Object.freeze({
  BOOT: "BOOT",
  MENU: "MENU",
  LOADING_WORLD: "LOADING_WORLD",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  ERROR: "ERROR",
});

export class Game {
  constructor(dom) {
    this.dom = dom;
    this.menuEl = dom.querySelector("#menu");
    this.gameEl = dom.querySelector("#game");
    this.canvas = dom.querySelector("#game-canvas");
    this.pauseOverlay = dom.querySelector("#pause-overlay");
    this.attributionEl = dom.querySelector("#attribution");
    this.state = GameState.BOOT;

    this.events = new EventBus();
    this.input = new Input();
    this.touchControls = new TouchControls(this.input, this.gameEl);
    this.touchControls.onPause = () => this.togglePause();
    this.touchControls.onToggleAssist = () => this.toggleAutoDrive();
    this.camera = new Camera();
    this.world = new World();
    this.renderer = new Renderer(this.canvas, this.camera, this.world);
    this.tileManager = null;
    this.player = null;

    this.physics = new PhysicsSystem();
    this.roadSystem = new RoadSystem(this.world);
    this.autoDrive = new AutoDriveSystem(this.world);
    this.spawnSystem = new SpawnSystem(this.world);
    this.collisionSystem = new CollisionSystem(this.world);

    this.hud = new Hud(this.gameEl, this.world);
    this.menu = new Menu(this.menuEl, (location, onProgress) =>
      this.loadWorld(location, onProgress)
    );
    this.loop = new GameLoop(this);

    this.debugEnabled = false;
    this.stats = {
      camera: { x: 0, y: 0 },
      tile: { x: 0, y: 0, zoom: GAME_CONFIG.tileZoom },
      tilesLoaded: 0,
      tilesFailed: 0,
      segments: 0,
      cells: 0,
      boundsLabel: "-",
    };
  }

  async init() {
    this.input.attach();
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.renderer.resize();
    window.addEventListener("resize", () => this.renderer.resize());
    window.addEventListener("keydown", (event) => {
      if (event.code === "Escape" && (this.state === GameState.PLAYING || this.state === GameState.PAUSED)) {
        event.preventDefault();
        this.togglePause();
      }
      if (event.code === "F3") {
        event.preventDefault();
        this.toggleDebug();
      }
      if (event.code === "KeyY") {
        this.toggleAutoDrive();
      }
    });

    this.touchControls.setAssistState(this.autoDrive.enabled);

    this.setState(GameState.MENU);
    this.loop.start();
    logger.info("game", "boot complete");
  }

  setState(state) {
    this.state = state;
    // Menu stays visible while loading/erroring so feedback shows.
    this.menuEl.hidden = state === GameState.PLAYING || state === GameState.PAUSED;
    this.gameEl.hidden = state !== GameState.PLAYING && state !== GameState.PAUSED;
    this.pauseOverlay.hidden = state !== GameState.PAUSED;
    this.input.setCapture(state === GameState.PLAYING || state === GameState.PAUSED);
    this.touchControls.setVisible(
      state === GameState.PLAYING || state === GameState.PAUSED
    );
  }

  async loadWorld(location, onProgress) {
    this.setState(GameState.LOADING_WORLD);
    try {
      await this.world.load(location, onProgress);

      onProgress?.("Preparing world...");
      const spawn = this.spawnSystem.findSpawn(location.lat, location.lng);
      this.player = new PlayerCar();
      this.player.snapPosition(spawn.x, spawn.y, spawn.heading);

      this.camera.x = spawn.x;
      this.camera.y = spawn.y;
      this.renderer.debugRenderer.setRoadResult(null);

      this.tileManager = new TileManager(
        this.createTileProvider(),
        GAME_CONFIG.tileZoom,
        GAME_CONFIG.maxTileCacheSize,
        MAP_CONFIG.crossOrigin
      );
      this.tileManager.setOrigin(this.world.origin);
      this.attributionEl.textContent = this.tileManager.provider.getAttribution();

      this.renderer.resize(); // canvas may have been hidden during menu
      this.setState(GameState.PLAYING);
      this.input.clear();
      logger.info("game", "gameplay started at", location.label);
    } catch (error) {
      logger.error("game", "world load failed:", error);
      this.setState(GameState.ERROR);
      this.menu.showError("Could not load road data for this location. Try another place.");
    }
  }

  createTileProvider() {
    return createTileProvider(this.menu.getSelectedProvider());
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.setState(GameState.PAUSED);
    } else if (this.state === GameState.PAUSED) {
      this.setState(GameState.PLAYING);
    }
    // Held keys must not survive a pause boundary.
    this.input.clear();
  }

  toggleDebug() {
    this.debugEnabled = !this.debugEnabled;
    this.hud.setDebug(this.debugEnabled);
  }

  toggleAutoDrive() {
    this.autoDrive.enabled = !this.autoDrive.enabled;
    this.touchControls.setAssistState(this.autoDrive.enabled);
  }

  // Fixed timestep simulation. Never touches the DOM or canvas.
  update(dt) {
    if (this.state !== GameState.PLAYING || !this.player) return;
    const assist = this.autoDrive.enabled ? this.autoDrive.steer(this.player) : 0;
    this.player.interpretInput(this.input.state, assist);
    const roadResult = this.roadSystem.update(this.player);
    this.physics.update(this.player, dt);
    this.collisionSystem.update(this.player);
    this.renderer.debugRenderer.setRoadResult(roadResult);
  }

  // Presentation pass: camera follow, tile streaming, HUD, canvas.
  render(alpha, frameTime) {
    this.hud.onFrame(frameTime);

    if (!this.player || !this.tileManager) {
      this.renderer.render(alpha, null, this.debugEnabled);
      return;
    }

    const player = this.player;
    const velocityX = Math.sin(player.heading) * player.speed;
    const velocityY = -Math.cos(player.heading) * player.speed;
    this.camera.update(frameTime, player.position, velocityX, velocityY);

    const viewport = {
      centerX: this.camera.x,
      centerY: this.camera.y,
      halfWidthMeters: this.camera.viewportWidth / 2 / this.camera.zoom,
      halfHeightMeters: this.camera.viewportHeight / 2 / this.camera.zoom,
    };
    this.tileManager.update(viewport);
    this.renderer.mapRenderer.setTiles(this.tileManager.visibleTiles);
    this.renderer.render(alpha, player, this.debugEnabled);

    const geo = localMetersToLatLng(this.camera.x, this.camera.y, this.world.origin);
    const tile = latLngToTileCoordinate(geo.lat, geo.lng, GAME_CONFIG.tileZoom);
    this.stats.camera.x = this.camera.x;
    this.stats.camera.y = this.camera.y;
    this.stats.tile = tile;
    this.stats.tilesLoaded = this.tileManager.stats.loadedTiles;
    this.stats.tilesFailed = this.tileManager.stats.failedTiles;
    this.stats.segments = this.world.roadNetwork.segments.length;
    this.stats.cells = this.world.roadNetwork.spatialIndex.cellCount;
    this.stats.assist = this.autoDrive.enabled;
    this.stats.boundsLabel = this.world.bounds
      ? `${this.world.bounds.south.toFixed(4)},${this.world.bounds.west.toFixed(4)},${this.world.bounds.north.toFixed(4)},${this.world.bounds.east.toFixed(4)}`
      : "-";

    this.hud.update(player, this.roadSystem.lastResult, this.stats);

    const inside = this.world.roadNetwork.isInsideBounds(
      player.position.x,
      player.position.y,
      80
    );
    if (!inside) {
      this.hud.showWarning("LEAVING LOADED AREA");
    } else {
      this.hud.hideWarning();
    }
  }
}
