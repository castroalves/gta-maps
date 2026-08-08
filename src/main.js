// Application entry point. Boots the game and shows a friendly message
// if something goes wrong before the menu is interactive.

import { Game } from "./core/game.js";
import { logger } from "./utils/logger.js";

const dom = document.querySelector("#app");

const game = new Game(dom);
game.init().catch((error) => {
  logger.error("game", "fatal startup error:", error);
  const errorBox = document.querySelector("#error");
  const errorText = document.querySelector("#error-text");
  if (errorBox && errorText) {
    errorBox.hidden = false;
    errorText.textContent = "The game could not start. Please reload the page.";
  }
});
