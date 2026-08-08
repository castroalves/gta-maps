// Draws the currently visible map tiles at their screen positions.
// Missing tiles render as a neutral fill until they stream in.

export class MapRenderer {
  constructor(ctx, camera) {
    this.ctx = ctx;
    this.camera = camera;
    this.tiles = [];
  }

  setTiles(tiles) {
    this.tiles = tiles;
  }

  render() {
    const ctx = this.ctx;
    for (const tile of this.tiles) {
      const pos = this.camera.worldToScreen(tile.screenX, tile.screenY);
      const size = tile.size * this.camera.zoom;
      if (tile.image) {
        ctx.drawImage(tile.image, pos.x, pos.y, size, size);
      } else {
        ctx.fillStyle = "#23281f";
        ctx.fillRect(pos.x, pos.y, size, size);
      }
    }
  }
}
