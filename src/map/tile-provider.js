// Generic tile provider interface. The renderer and tile manager only
// ever talk to this shape, never to a specific provider.

export class TileProvider {
  getTileUrl({ x, y, zoom }) {
    throw new Error("Not implemented");
  }

  getAttribution() {
    return "";
  }
}
