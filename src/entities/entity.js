// Base entity. Kept intentionally minimal — composition over
// inheritance, no speculative abstractions for future entity types.

export class Entity {
  constructor() {
    this.id = crypto.randomUUID();
    this.active = true;
  }

  update(dt) {}

  render(renderer) {}
}
