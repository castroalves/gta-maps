// Minimal console logger with per-module prefixes.
// Prefixes used across the app: game, map, osm, geo, physics.

function write(level, prefix, args) {
  const fn = level === "error" ? "error" : level === "warn" ? "warn" : level === "info" ? "info" : "log";
  // eslint-disable-next-line no-console
  console[fn](`[${prefix}]`, ...args);
}

export const logger = {
  debug: (prefix, ...args) => write("debug", prefix, args),
  info: (prefix, ...args) => write("info", prefix, args),
  warn: (prefix, ...args) => write("warn", prefix, args),
  error: (prefix, ...args) => write("error", prefix, args),
};
