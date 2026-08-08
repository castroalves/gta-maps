// Minimal pub/sub for cross-module notifications. Keeps modules
// decoupled without introducing a framework.

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const list = this.listeners.get(event);
    if (!list) return;
    const i = list.indexOf(callback);
    if (i >= 0) list.splice(i, 1);
  }

  emit(event, payload) {
    const list = this.listeners.get(event);
    if (!list) return;
    for (const callback of list.slice()) {
      try {
        callback(payload);
      } catch (error) {
        console.error("[game] event handler error:", error);
      }
    }
  }
}
