// Uniform spatial grid over road segments.
//
// A segment is inserted into every cell its bounding box touches, so a
// point query only has to look at the cell containing the point (plus
// neighbors when a search radius is given) instead of every segment.

export class SpatialIndex {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.segmentCount = 0;
  }

  cellFor(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize),
    };
  }

  insert(segment) {
    const minX = Math.min(segment.ax, segment.bx);
    const maxX = Math.max(segment.ax, segment.bx);
    const minY = Math.min(segment.ay, segment.by);
    const maxY = Math.max(segment.ay, segment.by);
    const c1 = this.cellFor(minX, minY);
    const c2 = this.cellFor(maxX, maxY);
    for (let cx = c1.x; cx <= c2.x; cx++) {
      for (let cy = c1.y; cy <= c2.y; cy++) {
        const key = `${cx}:${cy}`;
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(segment);
      }
    }
    this.segmentCount++;
  }

  // Returns the unique segments whose cells overlap the disc of the
  // given radius around (x, y). Radius 0 means just the own cell.
  query(x, y, radius = 0) {
    const c = this.cellFor(x, y);
    const span = Math.ceil(radius / this.cellSize);
    const segments = [];
    const seen = new Set();
    for (let cx = c.x - span; cx <= c.x + span; cx++) {
      for (let cy = c.y - span; cy <= c.y + span; cy++) {
        const bucket = this.cells.get(`${cx}:${cy}`);
        if (!bucket) continue;
        for (const segment of bucket) {
          if (!seen.has(segment)) {
            seen.add(segment);
            segments.push(segment);
          }
        }
      }
    }
    return segments;
  }

  get cellCount() {
    return this.cells.size;
  }
}
