// Keyboard state tracking. Events only mutate this state; physics
// reads the booleans during fixed-timestep simulation. No driving
// logic lives inside event handlers.
//
// capture is enabled only during gameplay so typing in the menu input
// (e.g. spaces in a city name) is never eaten by preventDefault().

const PREVENT_CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

export class Input {
  constructor() {
    this.keys = new Set();
    this.capture = false;
    // Virtual (touch) input merges with keyboard in refresh().
    this.virtual = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
    };
    this.state = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
    };
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = this.onBlur.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }

  setCapture(enabled) {
    this.capture = enabled;
    if (!enabled) this.clear();
  }

  onKeyDown(event) {
    if (!this.capture) return;
    if (PREVENT_CODES.includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      this.keys.add(event.code);
      this.refresh();
    }
  }

  onKeyUp(event) {
    if (!this.capture) return;
    this.keys.delete(event.code);
    this.refresh();
  }

  onBlur() {
    this.keys.clear();
    this.refresh();
  }

  // Set a virtual (touch) input flag. Ignored if the action is unknown.
  setVirtual(action, pressed) {
    if (!(action in this.virtual)) return;
    this.virtual[action] = pressed;
    this.refresh();
  }

  refresh() {
    const s = this.state;
    const k = this.keys;
    const v = this.virtual;
    s.accelerate = k.has("KeyW") || k.has("ArrowUp") || v.accelerate;
    s.brake = k.has("KeyS") || k.has("ArrowDown") || v.brake;
    s.left = k.has("KeyA") || k.has("ArrowLeft") || v.left;
    s.right = k.has("KeyD") || k.has("ArrowRight") || v.right;
    s.handbrake = k.has("Space") || v.handbrake;
  }

  clear() {
    this.keys.clear();
    this.virtual = {
      accelerate: false,
      brake: false,
      left: false,
      right: false,
      handbrake: false,
    };
    this.refresh();
  }
}
