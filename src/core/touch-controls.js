// Asphalt-style touch driving:
//
//  - A full-screen steering zone: touch anywhere to accelerate, drag
//    left/right to steer proportionally to finger position (a virtual
//    steering wheel centered on the screen).
//  - Dedicated BRAKE / HB buttons on the right. Multi-touch works, so
//    one finger steers while another brakes.
//  - AUTO button toggles the road-following assist (TouchDrive mode).
//
// Robustness notes:
//  - Binds BOTH pointer events (modern browsers) and legacy touch
//    events (older WebViews / in-app browsers that never fire
//    pointerdown). Only one scheme is active, chosen by feature test.
//  - Never releases on pointerleave: iOS Safari can fire it right
//    after pointerdown, which would instantly cancel the touch.
//  - If static touch detection misses the device, the first real
//    touchstart anywhere activates the touch UI at runtime.

import { clamp } from "../utils/math.js";
import { logger } from "../utils/logger.js";

export class TouchControls {
  constructor(input, dom) {
    this.input = input;
    this.dom = dom;
    this.buttons = [];
    this.onPause = null;
    this.onToggleAssist = null;
    this.activePointer = null;
    this.visible = false;
    this.isTouch = TouchControls.detectTouch();
    this.usePointer =
      typeof window !== "undefined" && "PointerEvent" in window;

    this.steerZone = dom.querySelector("#steer-zone");
    this.bindSteerZone(this.steerZone);

    this.bindButton(dom.querySelector("#btn-brake"), "brake");
    this.bindButton(dom.querySelector("#btn-handbrake"), "handbrake");

    const pause = dom.querySelector("#btn-pause");
    if (pause) {
      this.bindTap(pause, () => this.onPause?.());
      this.buttons.push(pause);
    }

    this.toggleBtn = dom.querySelector("#btn-assist");
    if (this.toggleBtn) {
      this.bindTap(this.toggleBtn, () => this.onToggleAssist?.());
      this.buttons.push(this.toggleBtn);
    }

    const hint = document.querySelector("#touch-hint");
    if (hint) hint.hidden = !this.isTouch;

    // Safety net for devices that fail static detection (desktop
    // browsers with touchscreens, exotic webviews).
    window.addEventListener(
      "touchstart",
      () => {
        if (this.isTouch) return;
        this.isTouch = true;
        const h = document.querySelector("#touch-hint");
        if (h) h.hidden = false;
        this.setVisible(this.visible);
      },
      { once: true, passive: true }
    );

    // Never leave steering/acceleration engaged if the app loses focus
    // or the page is hidden.
    window.addEventListener("blur", () => this.endSteer());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.endSteer();
    });

    if (this.isTouch) this.show();
  }

  static detectTouch() {
    const w = typeof window !== "undefined" ? window : null;
    if (!w) return false;
    return Boolean(
      (w.matchMedia && w.matchMedia("(pointer: coarse)").matches) ||
        (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) ||
        "ontouchstart" in w
    );
  }

  // Alias kept for callers that use the old name.
  static isTouchDevice() {
    return TouchControls.detectTouch();
  }

  // ------------------------------------------------------------------
  // Steering zone
  // ------------------------------------------------------------------

  bindSteerZone(zone) {
    // Steering is bound by delegation on the whole game element, not
    // just the zone div, so a touch anywhere on the game area (canvas,
    // map, empty space) starts driving no matter which element the
    // browser picks as the event target. Buttons are excluded so they
    // keep their own press/release semantics.
    const root = this.dom;
    if (!root) return;
    const isUiButton = (target) =>
      Boolean(target && typeof target.closest === "function" && target.closest("button"));

    if (this.usePointer) {
      root.addEventListener("pointerdown", (event) => {
        if (isUiButton(event.target)) return;
        if (this.activePointer !== null) return; // one steering finger
        this.activePointer = event.pointerId;
        event.preventDefault();
        this.beginSteer(event.clientX);
      });
      root.addEventListener("pointermove", (event) => {
        if (event.pointerId !== this.activePointer) return;
        this.updateSteer(event.clientX);
      });
      root.addEventListener("pointerup", (event) => {
        if (event.pointerId === this.activePointer) this.endSteer();
      });
      root.addEventListener("pointercancel", (event) => {
        if (event.pointerId === this.activePointer) this.endSteer();
      });
    } else {
      root.addEventListener(
        "touchstart",
        (event) => {
          if (isUiButton(event.target)) return;
          if (this.activePointer !== null) return;
          event.preventDefault();
          const touch = event.touches[0];
          this.activePointer = touch.identifier;
          this.beginSteer(touch.clientX);
        },
        { passive: false }
      );
      root.addEventListener(
        "touchmove",
        (event) => {
          const touch = Array.from(event.touches).find(
            (t) => t.identifier === this.activePointer
          );
          if (touch) this.updateSteer(touch.clientX);
        },
        { passive: true }
      );
      const endTouch = (event) => {
        const ended = Array.from(event.changedTouches).some(
          (t) => t.identifier === this.activePointer
        );
        if (ended) this.endSteer();
      };
      root.addEventListener("touchend", endTouch);
      root.addEventListener("touchcancel", endTouch);
    }
  }

  beginSteer(clientX) {
    this.input.setVirtual("accelerate", true);
    this.updateSteer(clientX);
    logger.debug("touch", "steer begin");
  }

  // Position-based steering: finger left of center steers left,
  // proportionally to the offset, with a small dead zone at center.
  updateSteer(clientX) {
    const width = window.innerWidth || this.dom.clientWidth || 800;
    const center = width / 2;
    const range = width * 0.28; // full lock at ~28% of screen width
    const raw = clamp((clientX - center) / range, -1, 1);
    const dead = 0.05;
    const steer =
      Math.abs(raw) < dead ? 0 : (raw - Math.sign(raw) * dead) / (1 - dead);
    this.input.setSteer(steer);
  }

  endSteer() {
    if (this.activePointer === null) return;
    this.activePointer = null;
    this.input.setVirtual("accelerate", false);
    this.input.setSteer(0);
    logger.debug("touch", "steer end");
  }

  // ------------------------------------------------------------------
  // Buttons
  // ------------------------------------------------------------------

  bindButton(el, action) {
    if (!el) return;
    const press = (event) => {
      event.preventDefault();
      this.input.setVirtual(action, true);
    };
    const release = (event) => {
      event.preventDefault();
      this.input.setVirtual(action, false);
    };
    if (this.usePointer) {
      el.addEventListener("pointerdown", press);
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
    } else {
      el.addEventListener("touchstart", press, { passive: false });
      el.addEventListener("touchend", release);
      el.addEventListener("touchcancel", release);
    }
    this.buttons.push(el);
  }

  bindTap(el, callback) {
    if (!el) return;
    const handler = (event) => {
      event.preventDefault();
      callback();
    };
    if (this.usePointer) {
      el.addEventListener("pointerdown", handler);
    } else {
      el.addEventListener("touchstart", handler, { passive: false });
    }
  }

  // ------------------------------------------------------------------
  // Visibility
  // ------------------------------------------------------------------

  setAssistState(enabled) {
    if (!this.toggleBtn) return;
    this.toggleBtn.textContent = enabled ? "AUTO" : "MANUAL";
    this.toggleBtn.classList.toggle("off", !enabled);
  }

  // Show only during gameplay on touch devices.
  setVisible(enabled) {
    this.visible = enabled;
    this.dom.hidden = !(enabled && this.isTouch);
  }

  show() {
    this.visible = true;
    this.dom.hidden = false;
  }

  hide() {
    this.visible = false;
    this.dom.hidden = true;
  }
}
