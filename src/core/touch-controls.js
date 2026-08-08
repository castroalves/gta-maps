// Asphalt-style touch driving:
//
//  - A full-screen steering zone: touch anywhere to accelerate, drag
//    left/right to steer proportionally to finger position (a virtual
//    steering wheel centered on the screen).
//  - Dedicated BRAKE / HB buttons on the right. Multi-touch works via
//    pointer events, so one finger steers while another brakes.
//  - AUTO button toggles the road-following assist (TouchDrive mode);
//    the car follows streets by itself and the player steers on top.
//
// Shown automatically on coarse-pointer (touch) devices.

import { clamp } from "../utils/math.js";

export class TouchControls {
  constructor(input, dom) {
    this.input = input;
    this.dom = dom;
    this.buttons = [];
    this.onPause = null;
    this.onToggleAssist = null;
    this.activePointer = null;

    this.steerZone = dom.querySelector("#steer-zone");
    this.bindSteerZone(this.steerZone);

    this.bindButton(dom.querySelector("#btn-brake"), "brake");
    this.bindButton(dom.querySelector("#btn-handbrake"), "handbrake");

    const pause = dom.querySelector("#btn-pause");
    if (pause) {
      pause.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onPause?.();
      });
      this.buttons.push(pause);
    }

    this.toggleBtn = dom.querySelector("#btn-assist");
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.onToggleAssist?.();
      });
      this.buttons.push(this.toggleBtn);
    }

    // Surface the touch hint in the menu on touch devices.
    const hint = document.querySelector("#touch-hint");
    if (hint) hint.hidden = !TouchControls.isTouchDevice();

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

  bindSteerZone(zone) {
    if (!zone) return;
    zone.addEventListener("pointerdown", (event) => {
      if (this.activePointer !== null) return; // one steering finger
      this.activePointer = event.pointerId;
      event.preventDefault();
      this.input.setVirtual("accelerate", true);
      this.updateSteer(event.clientX);
    });
    zone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.activePointer) return;
      this.updateSteer(event.clientX);
    });
    const end = (event) => {
      if (event.pointerId !== this.activePointer) return;
      this.activePointer = null;
      this.input.setVirtual("accelerate", false);
      this.input.setSteer(0);
    };
    zone.addEventListener("pointerup", end);
    zone.addEventListener("pointercancel", end);
    zone.addEventListener("pointerleave", end);
  }

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
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
    this.buttons.push(el);
  }

  // Position-based steering: finger left of center steers left,
  // proportionally to the offset, with a small dead zone at center.
  updateSteer(clientX) {
    const width = (window.innerWidth || this.dom.clientWidth || 800) ;
    const center = width / 2;
    const range = width * 0.28; // full lock at ~28% of screen width
    const raw = clamp((clientX - center) / range, -1, 1);
    const dead = 0.05;
    const steer =
      Math.abs(raw) < dead ? 0 : (raw - Math.sign(raw) * dead) / (1 - dead);
    this.input.setSteer(steer);
  }

  setAssistState(enabled) {
    if (!this.toggleBtn) return;
    this.toggleBtn.textContent = enabled ? "AUTO" : "MANUAL";
    this.toggleBtn.classList.toggle("off", !enabled);
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
