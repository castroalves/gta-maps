// On-screen touch controls for mobile. Buttons feed the same boolean
// input state as the keyboard, so physics never knows (or cares) how
// the input originated. Uses pointer events, which handle multi-touch
// naturally: each button owns its own press/release listeners.
//
// Shown automatically on coarse-pointer (touch) devices.

const BINDINGS = {
  "#btn-left": "left",
  "#btn-right": "right",
  "#btn-gas": "accelerate",
  "#btn-brake": "brake",
  "#btn-handbrake": "handbrake",
};

export class TouchControls {
  constructor(input, dom) {
    this.input = input;
    this.dom = dom;
    this.buttons = [];
    this.onPause = null;

    for (const [selector, action] of Object.entries(BINDINGS)) {
      const el = dom.querySelector(selector);
      if (!el) continue;
      const press = (event) => {
        event.preventDefault();
        this.input.setVirtual(action, true);
      };
      const release = (event) => {
        event.preventDefault();
        this.input.setVirtual(action, false);
      };
      el.addEventListener("pointerdown", press);
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
      el.addEventListener("pointerleave", release);
      this.buttons.push(el);
    }

    const pause = dom.querySelector("#btn-pause");
    if (pause) {
      pause.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onPause?.();
      });
      this.buttons.push(pause);
    }

    if (TouchControls.isTouchDevice()) {
      this.show();
    }
  }

  static isTouchDevice() {
    const w = typeof window !== "undefined" ? window : null;
    return Boolean(
      w &&
        ((w.matchMedia && w.matchMedia("(pointer: coarse)").matches) ||
          "ontouchstart" in w)
    );
  }

  // Show only during gameplay on touch devices.
  setVisible(enabled) {
    this.dom.hidden = !(enabled && TouchControls.isTouchDevice());
  }

  show() {
    this.dom.hidden = false;
  }

  hide() {
    this.dom.hidden = true;
  }
}
