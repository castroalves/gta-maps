// Simple LRU-style in-memory tile cache.
//
// Map iteration order doubles as recency order: every get() re-inserts
// the entry at the end, and prune() evicts from the front.

export class TileCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    this.map.delete(key);
    this.map.set(key, entry);
    return entry;
  }

  set(key, entry) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, entry);
    this.prune();
  }

  get size() {
    return this.map.size;
  }

  prune() {
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
  }

  clear() {
    this.map.clear();
  }
}
