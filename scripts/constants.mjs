/**
 * Mapa-mundi-FU: constants and small helpers. Labels are Portuguese (no lang files).
 */
export const MODULE_ID = "mapa-mundi-fu";
export const MODULE_TITLE = "Mapa-múndi";
export const SOCKET = `module.${MODULE_ID}`;
export const PATH = `modules/${MODULE_ID}`;

/** The map space: the World Sheet's 30 x 20 grid, 80 units per square. */
export const MAP_W = 2400;
export const MAP_H = 1600;
export const CELL = 80;

export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const num = (value, fallback, min = -Infinity, max = Infinity) => {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
};

export const str = (value, fallback = "", max = 4000) => (typeof value === "string" ? value.slice(0, max) : fallback);

export const bool = (value, fallback = false) => (typeof value === "boolean" ? value : fallback);

const HEX = /^#[0-9a-f]{6}$/i;
export const color = (value, fallback = null) => {
  if ( typeof value !== "string" ) return fallback;
  const v = value.trim();
  if ( HEX.test(v) ) return v.toLowerCase();
  if ( /^#[0-9a-f]{3}$/i.test(v) ) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  return fallback;
};

/** Random id that is safe as a key and a DOM attribute. */
export function uid(prefix = "o") {
  const r = globalThis.foundry?.utils?.randomID?.(10) ?? Math.random().toString(36).slice(2, 12);
  return `${prefix}${r}`;
}

/** Mix a hex colour with black (t < 0) or white (t > 0). */
export function shade(hex, t) {
  const c = color(hex, "#888888");
  const n = parseInt(c.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const target = t < 0 ? 0 : 255;
  const k = Math.abs(t);
  r = Math.round(r + (target - r) * k);
  g = Math.round(g + (target - g) * k);
  b = Math.round(b + (target - b) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function hexToRgba(hex, alpha = 1) {
  const n = parseInt(color(hex, "#000000").slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = (Number(seed) >>> 0) || 1;
  return function() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string into a 32-bit seed. */
export function hashSeed(text) {
  let h = 2166136261;
  for ( const ch of String(text ?? "") ) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DIACRITICS = new RegExp(`[${String.fromCharCode(0x300)}-${String.fromCharCode(0x36f)}]`, "g");
export const fold = s => String(s ?? "").normalize("NFD").replace(DIACRITICS, "").toLowerCase();

/** Format a number of travel days the Brazilian way (one decimal at most). */
export function formatDays(days) {
  const rounded = Math.round(days * 10) / 10;
  const text = rounded.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${text} ${rounded === 1 ? "dia" : "dias"}`;
}
