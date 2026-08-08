// Location-selection menu: search field, coordinate input, preset
// city buttons, loading feedback, and error/retry handling.
//
// User-facing messages stay non-technical; details go to the console.

import { parseCoordinateInput, searchPlace } from "../geo/geocoder.js";
import { logger } from "../utils/logger.js";

export const PRESET_LOCATIONS = [
  { label: "Lisbon, Portugal", lat: 38.7079, lng: -9.1366 },
  { label: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 },
  { label: "Tokyo, Japan", lat: 35.6812, lng: 139.7671 },
  { label: "New York, USA", lat: 40.758, lng: -73.9855 },
];

export class Menu {
  constructor(dom, onSubmit) {
    this.dom = dom;
    this.onSubmit = onSubmit;
    this.form = dom.querySelector("#location-form");
    this.input = dom.querySelector("#location-input");
    this.loading = dom.querySelector("#loading");
    this.errorBox = dom.querySelector("#error");
    this.errorText = dom.querySelector("#error-text");
    this.retryButton = dom.querySelector("#retry-button");
    this.presets = dom.querySelector("#presets");
    this.lastRequest = null;
    this.busy = false;

    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit(this.input.value);
    });

    for (const preset of PRESET_LOCATIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "preset-button";
      button.textContent = preset.label.split(",")[0];
      button.addEventListener("click", () => this.submit(preset.label, preset));
      this.presets.appendChild(button);
    }

    this.retryButton.addEventListener("click", () => {
      if (this.lastRequest) {
        this.submit(this.lastRequest.query, this.lastRequest.location);
      }
    });
  }

  async submit(query, presetLocation) {
    if (this.busy) return;
    if (!presetLocation && (!query || !query.trim())) return;
    this.busy = true;
    this.hideError();
    this.showLoading("Loading map...");
    try {
      let location = presetLocation || parseCoordinateInput(query);
      if (!location) {
        location = await searchPlace(query);
      }
      this.lastRequest = { query, location };
      await this.onSubmit(location, (message) => this.showLoading(message));
      this.hideLoading();
    } catch (error) {
      logger.error("game", "location load failed:", error);
      this.hideLoading();
      this.showError("Could not load this location. Try another place.");
    } finally {
      this.busy = false;
    }
  }

  showLoading(message) {
    this.loading.hidden = false;
    this.loading.textContent = message;
  }

  hideLoading() {
    this.loading.hidden = true;
  }

  showError(message) {
    this.errorBox.hidden = false;
    this.errorText.textContent = message;
  }

  hideError() {
    this.errorBox.hidden = true;
  }
}
