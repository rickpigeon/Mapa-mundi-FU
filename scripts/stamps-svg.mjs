/**
 * Mapa-mundi-FU: the stamp drawings (original art for this module), one SVG <symbol> per stamp, in a
 * 100 x 100 box. Colours come from CSS variables set on each stamp: --c1 (main, tintable), --c2, --c3,
 * the derived --c1d/--c1l/--c2d (darker/lighter, see the stylesheet) and --ink (outline).
 */

import { PATH, shade } from "./constants.mjs";
import { STAMPS } from "./catalog.mjs";

/** Darker variant of a fill token: "c1" -> "c1d", "#hex" -> darker hex. */
const dark = f => (f.startsWith("#") ? shade(f, -0.28) : `${f}d`);

const FILL = f => {
  if ( !f || f === "none" ) return "none";
  if ( f.startsWith("#") ) return f;
  if ( f === "w" ) return "#ffffff";
  if ( f === "k" ) return "#1b1714";
  return `var(--${f})`;
};
const style = (fill, sw, extra = "") => `style="fill:${FILL(fill)};stroke:${sw ? "var(--ink)" : "none"};stroke-width:${sw || 0};stroke-linejoin:round;stroke-linecap:round${extra}"`;
/** filled shape with ink outline */
const S = (d, fill = "c1", sw = 3, extra = "") => `<path d="${d}" ${style(fill, sw, extra)}/>`;
/** filled shape without outline */
const F = (d, fill = "c1d", extra = "") => `<path d="${d}" ${style(fill, 0, extra)}/>`;
/** stroke only (colour token) */
const L = (d, col = "ink", sw = 3, extra = "") => `<path d="${d}" style="fill:none;stroke:${FILL(col)};stroke-width:${sw};stroke-linejoin:round;stroke-linecap:round${extra}"/>`;
const C = (cx, cy, r, fill = "c1", sw = 3, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" ${style(fill, sw, extra)}/>`;
const E = (cx, cy, rx, ry, fill = "c1", sw = 3, extra = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${style(fill, sw, extra)}/>`;
const G = (t, ...kids) => `<g transform="${t}">${kids.join("")}</g>`;

/* ---------- building blocks ---------- */

/** A mountain with a shaded right flank and an optional snow cap. */
function peak(cx, base, w, h, snow = true) {
  const l = cx - w / 2, r = cx + w / 2, ax = cx - w * 0.06, ay = base - h;
  const s1x = ax + w * 0.13, s1y = ay + h * 0.2;
  const s2x = ax + w * 0.2, s2y = ay + h * 0.13;
  const outline = `M${l} ${base} L${ax} ${ay} L${s1x} ${s1y} L${s2x} ${s2y} L${r} ${base} Z`;
  const shadeD = `M${ax} ${ay} L${s1x} ${s1y} L${s2x} ${s2y} L${r} ${base} L${cx + w * 0.04} ${base} L${cx + w * 0.1} ${base - h * 0.42} L${cx - w * 0.02} ${base - h * 0.66} Z`;
  let snowD = "";
  if ( snow ) {
    const k = 0.34;
    snowD = S(`M${ax} ${ay} L${ax - w * 0.5 * k * 0.62} ${ay + h * k * 0.95} L${ax - w * 0.08} ${ay + h * k * 0.72} L${ax - w * 0.01} ${ay + h * k} L${ax + w * 0.07} ${ay + h * k * 0.7} L${s1x} ${s1y} Z`, "c2", 2);
  }
  return S(outline, "c1") + F(shadeD, "c1d") + snowD + S(outline, "none");
}

function roundTree(cx, base, s = 1) {
  return S(`M${cx - 3 * s} ${base} L${cx - 2.5 * s} ${base - 14 * s} L${cx + 2.5 * s} ${base - 14 * s} L${cx + 3 * s} ${base} Z`, "c2", 2.5)
    + C(cx, base - 22 * s, 13 * s, "c1")
    + F(`M${cx + 12 * s} ${base - 20 * s} A${13 * s} ${13 * s} 0 0 1 ${cx - 6 * s} ${base - 10.5 * s} A${11 * s} ${11 * s} 0 0 0 ${cx + 12 * s} ${base - 20 * s} Z`, "c1d")
    + C(cx - 4.5 * s, base - 27 * s, 3.4 * s, "c1l", 0)
    + C(cx, base - 22 * s, 13 * s, "none");
}

function pineTree(cx, base, s = 1) {
  return S(`M${cx - 2.5 * s} ${base} L${cx - 2.5 * s} ${base - 8 * s} L${cx + 2.5 * s} ${base - 8 * s} L${cx + 2.5 * s} ${base} Z`, "c2", 2.5)
    + S(`M${cx} ${base - 44 * s} L${cx - 9 * s} ${base - 28 * s} L${cx - 5 * s} ${base - 28 * s} L${cx - 13 * s} ${base - 16 * s} L${cx - 7 * s} ${base - 16 * s} L${cx - 15 * s} ${base - 6 * s} L${cx + 15 * s} ${base - 6 * s} L${cx + 7 * s} ${base - 16 * s} L${cx + 13 * s} ${base - 16 * s} L${cx + 5 * s} ${base - 28 * s} L${cx + 9 * s} ${base - 28 * s} Z`, "c1")
    + F(`M${cx} ${base - 44 * s} L${cx + 9 * s} ${base - 28 * s} L${cx + 5 * s} ${base - 28 * s} L${cx + 13 * s} ${base - 16 * s} L${cx + 7 * s} ${base - 16 * s} L${cx + 15 * s} ${base - 6 * s} L${cx + 3 * s} ${base - 6 * s} Z`, "c1d")
    + S(`M${cx} ${base - 44 * s} L${cx - 9 * s} ${base - 28 * s} L${cx - 5 * s} ${base - 28 * s} L${cx - 13 * s} ${base - 16 * s} L${cx - 7 * s} ${base - 16 * s} L${cx - 15 * s} ${base - 6 * s} L${cx + 15 * s} ${base - 6 * s} L${cx + 7 * s} ${base - 16 * s} L${cx + 13 * s} ${base - 16 * s} L${cx + 5 * s} ${base - 28 * s} L${cx + 9 * s} ${base - 28 * s} Z`, "none");
}

function house(x, base, w, h, roof = "c1", wall = "c2") {
  const r = x + w;
  return S(`M${x} ${base} L${x} ${base - h} L${r} ${base - h} L${r} ${base} Z`, wall, 2.5)
    + S(`M${x - 3} ${base - h + 1} L${x + w / 2} ${base - h - w * 0.62} L${r + 3} ${base - h + 1} Z`, roof, 2.5)
    + F(`M${x + w / 2} ${base - h - w * 0.62} L${r + 3} ${base - h + 1} L${x + w / 2 + 1} ${base - h + 1} Z`, dark(roof))
    + S(`M${x + w / 2 - 2.5} ${base} L${x + w / 2 - 2.5} ${base - h * 0.5} L${x + w / 2 + 2.5} ${base - h * 0.5} L${x + w / 2 + 2.5} ${base} Z`, "k", 0);
}

function tower(x, base, w, h, roof = "c2", body = "c1") {
  const r = x + w;
  return S(`M${x} ${base} L${x} ${base - h} L${r} ${base - h} L${r} ${base} Z`, body, 2.5)
    + F(`M${x + w * 0.62} ${base} L${x + w * 0.62} ${base - h} L${r} ${base - h} L${r} ${base} Z`, dark(body))
    + S(`M${x} ${base} L${x} ${base - h} L${r} ${base - h} L${r} ${base} Z`, "none", 2.5)
    + S(`M${x - 3} ${base - h} L${x + w / 2} ${base - h - w * 1.1} L${r + 3} ${base - h} Z`, roof, 2.5)
    + S(`M${x + w / 2 - 2} ${base - h * 0.62} L${x + w / 2 - 2} ${base - h * 0.78} L${x + w / 2 + 2} ${base - h * 0.78} L${x + w / 2 + 2} ${base - h * 0.62} Z`, "k", 0);
}

function crenelWall(x, base, w, h, fill = "c1") {
  const step = w / 7;
  let top = `M${x} ${base} L${x} ${base - h - 5}`;
  for ( let i = 0; i < 7; i++ ) {
    const a = x + i * step;
    top += i % 2 === 0 ? ` L${a + step} ${base - h - 5} L${a + step} ${base - h}` : ` L${a + step} ${base - h} L${a + step} ${base - h - 5}`;
  }
  top += ` L${x + w} ${base} Z`;
  return S(top, fill, 2.5);
}

function flag(x, y, color = "c2", h = 14) {
  return L(`M${x} ${y} L${x} ${y - h}`, "ink", 2) + S(`M${x} ${y - h} L${x + 10} ${y - h + 3.5} L${x} ${y - h + 7} Z`, color, 1.6);
}

function cloudPuff(cx, cy, s = 1, fill = "#d9d6d2") {
  return S(`M${cx - 12 * s} ${cy} a${6 * s} ${6 * s} 0 0 1 ${3 * s} -${10 * s} a${8 * s} ${8 * s} 0 0 1 ${15 * s} -${2 * s} a${6 * s} ${6 * s} 0 0 1 ${7 * s} ${12 * s} Z`, fill, 2);
}

function waterLine(y, x0 = 8, x1 = 92) {
  let d = `M${x0} ${y}`;
  for ( let x = x0; x < x1; x += 12 ) d += ` q3 -4 6 0 q3 4 6 0`;
  return L(d, "c3", 2.5);
}

/* ---------- the stamps ---------- */

export const STAMP_SVG = {
  /* relevo */
  montanha: peak(50, 86, 84, 66),
  cordilheira: peak(30, 76, 50, 46) + peak(72, 74, 48, 50) + peak(50, 90, 66, 62),
  pico: peak(50, 90, 70, 82),
  colinas: S("M6 84 Q28 34 54 84 Z") + F("M30 47 Q44 56 54 84 L36 84 Q40 64 30 47 Z") + S("M6 84 Q28 34 54 84 Z", "none")
    + S("M36 86 Q64 44 94 86 Z") + F("M64 54 Q80 64 94 86 L72 86 Q74 70 64 54 Z") + S("M36 86 Q64 44 94 86 Z", "none")
    + L("M18 66 q4 -3 8 0", "c2", 2) + L("M54 70 q4 -3 8 0", "c2", 2),
  vulcao: cloudPuff(54, 22, 1.1, "#bcb5ad") + cloudPuff(40, 12, 0.8, "#cfc9c2")
    + S("M10 88 L38 36 L62 36 L90 88 Z") + F("M50 38 L62 36 L90 88 L58 88 L60 60 Z")
    + S("M10 88 L38 36 L62 36 L90 88 Z", "none") + E(50, 36, 12, 4, "c2", 2.5)
    + S("M42 38 L40 52 L45 47 L47 60 L51 46 L55 54 L57 39 Z", "c2", 2),
  mesa: S("M8 86 L20 42 L80 42 L92 86 Z") + F("M62 42 L80 42 L92 86 L66 86 Z") + S("M8 86 L20 42 L80 42 L92 86 Z", "none")
    + L("M16 58 L84 58", "c2", 2.5) + L("M12 72 L88 72", "c2", 2.5) + S("M20 42 L80 42 L78 47 L22 47 Z", "c1l", 2),
  rochedo: S("M14 84 L18 62 L32 54 L44 62 L46 84 Z") + F("M32 54 L44 62 L46 84 L36 84 L38 66 Z")
    + S("M40 86 L46 50 L62 38 L80 50 L88 86 Z") + F("M62 38 L80 50 L88 86 L70 86 L72 56 Z") + S("M40 86 L46 50 L62 38 L80 50 L88 86 Z", "none")
    + S("M70 88 L74 76 L84 72 L92 80 L92 88 Z", "c1"),
  cratera: E(50, 60, 42, 24) + E(50, 58, 30, 15, "c2") + F("M22 62 Q50 82 78 62 Q50 70 22 62 Z", "c1d") + L("M30 48 l-4 -6 M50 44 l0 -7 M70 48 l4 -6", "ink", 2.5),
  cristal: S("M28 86 L22 54 L32 40 L40 54 L38 86 Z", "c2") + S("M44 88 L38 40 L52 18 L64 40 L58 88 Z", "c1") + F("M52 18 L64 40 L58 88 L52 88 Z", "c1d")
    + S("M44 88 L38 40 L52 18 L64 40 L58 88 Z", "none") + S("M64 86 L62 58 L72 46 L80 58 L74 86 Z", "c2") + L("M46 42 L50 30", "w", 2.5),
  dunas: S("M4 80 Q26 50 48 70 Q66 52 96 76 L96 88 L4 88 Z") + F("M26 58 Q36 60 48 70 Q40 74 30 86 L20 86 Q30 72 26 58 Z")
    + F("M66 58 Q80 62 96 76 L96 88 L74 88 Q78 72 66 58 Z") + S("M4 80 Q26 50 48 70 Q66 52 96 76 L96 88 L4 88 Z", "none")
    + L("M12 82 q12 -6 24 0", "c2", 2),

  /* vegetação */
  arvore: roundTree(50, 88, 2.1),
  pinheiro: pineTree(50, 92, 1.9),
  floresta: roundTree(32, 66, 1.25) + roundTree(70, 62, 1.25) + roundTree(50, 90, 1.45) + roundTree(22, 92, 1.05) + roundTree(80, 92, 1.05),
  bosque: pineTree(30, 66, 1.05) + pineTree(66, 62, 1.05) + pineTree(48, 92, 1.25) + pineTree(18, 94, 0.95) + pineTree(80, 94, 0.95),
  palmeira: L("M50 90 Q44 64 56 36", "ink", 9) + L("M50 90 Q44 64 56 36", "c2", 5)
    + S("M56 36 Q40 24 20 34 Q40 30 56 40 Z", "c1", 2.5) + S("M56 36 Q72 22 90 32 Q72 30 56 40 Z", "c1", 2.5)
    + S("M56 36 Q50 14 34 10 Q50 20 54 38 Z", "c1", 2.5) + S("M56 36 Q70 44 74 62 Q64 46 54 40 Z", "c1", 2.5)
    + S("M56 36 Q40 44 34 60 Q46 46 56 40 Z", "c1", 2.5) + C(56, 40, 3.5, "c2", 2),
  anciao: S("M42 92 Q46 70 40 52 L60 52 Q54 70 58 92 Q66 92 72 96 L28 96 Q34 92 42 92 Z", "#7a5a3a")
    + F("M52 54 L60 52 Q54 70 58 92 L52 92 Z", "#5d4430")
    + S("M50 8 C76 6 96 24 88 42 C98 58 76 66 62 58 C54 66 38 66 34 58 C14 64 2 48 12 36 C4 20 26 4 50 8 Z")
    + F("M88 42 C98 58 76 66 62 58 C54 66 38 66 34 58 C46 60 60 54 66 48 C76 50 86 48 88 42 Z", "c1d")
    + C(30, 30, 4, "c2", 2, ";filter:drop-shadow(0 0 3px var(--c2))") + C(62, 22, 4, "c2", 2, ";filter:drop-shadow(0 0 3px var(--c2))")
    + C(70, 44, 4, "c2", 2, ";filter:drop-shadow(0 0 3px var(--c2))") + C(46, 40, 3.2, "c2", 2, ";filter:drop-shadow(0 0 3px var(--c2))"),
  cogumelos: S("M30 90 L32 58 L42 58 L44 90 Z", "c2", 2.5) + S("M14 60 Q36 22 60 60 Z", "c1") + F("M37 41 Q52 46 60 60 L44 60 Q46 50 37 41 Z")
    + S("M14 60 Q36 22 60 60 Z", "none") + C(30, 48, 3, "c2", 0) + C(42, 40, 2.6, "c2", 0) + C(46, 52, 2.4, "c2", 0)
    + S("M64 90 L65 70 L71 70 L72 90 Z", "c2", 2.5) + S("M54 72 Q68 48 84 72 Z", "c1") + C(64, 64, 2, "c2", 0) + C(73, 62, 2, "c2", 0),
  cactos: S("M42 90 L42 24 Q50 14 58 24 L58 90 Z") + S("M42 56 L32 56 Q26 56 26 48 L26 36 Q30 30 34 36 L34 46 L42 46 Z")
    + S("M58 64 L68 64 Q74 64 74 56 L74 42 Q70 36 66 42 L66 54 L58 54 Z") + F("M52 22 Q56 24 58 26 L58 90 L52 90 Z")
    + C(50, 18, 4, "c2", 2) + C(30, 33, 3, "c2", 2) + L("M50 32 L50 84", "c1d", 2),
  arvoreMorta: L("M50 92 L50 50 M50 64 L32 46 M32 46 L22 48 M32 46 L30 32 M50 54 L66 36 M66 36 L80 34 M66 36 L64 22 M50 50 L48 26", "ink", 8)
    + L("M50 92 L50 50 M50 64 L32 46 M32 46 L22 48 M32 46 L30 32 M50 54 L66 36 M66 36 L80 34 M66 36 L64 22 M50 50 L48 26", "c1", 4.5)
    + S("M36 94 Q50 84 64 94 Z", "c2", 2),
  flores: L("M20 88 Q24 70 22 60 M34 88 Q34 70 38 56 M50 90 Q50 72 48 58 M64 88 Q66 72 70 60 M78 88 Q76 74 80 64", "#4f8a45", 3)
    + [[22, 58], [38, 54], [48, 56], [70, 58], [80, 62]].map(([x, y], i) => (
      C(x - 5, y, 4.2, "c1", 1.8) + C(x + 5, y, 4.2, "c1", 1.8) + C(x, y - 5, 4.2, "c1", 1.8) + C(x, y + 5, 4.2, "c1", 1.8) + C(x, y, 3.2, "c2", 1.6)
    )).join(""),

  /* águas */
  lago: S("M14 58 C10 40 34 30 52 34 C74 30 94 42 88 60 C84 76 60 80 44 76 C24 78 16 70 14 58 Z")
    + F("M88 60 C84 76 60 80 44 76 C60 72 78 70 88 60 Z", "c1d") + L("M30 50 q6 -4 12 0 M54 60 q6 -4 12 0 M40 66 q4 -3 8 0", "c2", 2.5),
  redemoinho: C(50, 50, 40, "c1", 3) + L("M50 50 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 0 1 12 -12 a18 18 0 0 1 18 18 a24 24 0 0 1 -24 24 a30 30 0 0 1 -30 -30 a34 34 0 0 1 30 -34", "c2", 4.5)
    + L("M50 50 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 0 1 12 -12 a18 18 0 0 1 18 18 a24 24 0 0 1 -24 24 a30 30 0 0 1 -30 -30 a34 34 0 0 1 30 -34", "c1d", 1.5),
  iceberg: S("M14 72 L26 40 L40 46 L52 20 L66 36 L78 32 L88 72 Z", "c1") + F("M52 20 L66 36 L78 32 L88 72 L60 72 L58 44 Z", "c2")
    + S("M14 72 L26 40 L40 46 L52 20 L66 36 L78 32 L88 72 Z", "none") + E(51, 74, 44, 6, "#5aa0d0", 2.5)
    + S("M22 74 L34 88 L66 90 L80 74 Z", "c2", 2, ";opacity:0.55"),
  recife: L("M30 90 L30 66 L22 54 M30 72 L40 58 M30 66 L34 52", "ink", 7) + L("M30 90 L30 66 L22 54 M30 72 L40 58 M30 66 L34 52", "c1", 4)
    + L("M62 90 L62 58 L52 44 M62 64 L74 48 L78 38 M74 48 L84 50 M62 58 L64 40", "ink", 7) + L("M62 90 L62 58 L52 44 M62 64 L74 48 L78 38 M74 48 L84 50 M62 58 L64 40", "c1", 4)
    + C(46, 84, 6, "c2", 2) + C(80, 84, 5, "c2", 2) + C(16, 86, 4, "c2", 2),
  cachoeira: S("M8 30 L36 26 L40 90 L8 90 Z", "c1") + S("M64 26 L92 30 L92 90 L60 90 Z", "c1") + F("M80 28 L92 30 L92 90 L76 90 Z", "c1d")
    + S("M36 26 L64 26 L62 80 L38 80 Z", "c2", 2.5) + L("M44 30 L44 76 M52 30 L52 78 M58 30 L58 74", "w", 2.5)
    + E(50, 84, 20, 7, "c2", 2.5) + C(36, 80, 4, "w", 1.5) + C(64, 80, 4, "w", 1.5),
  ondas: [[20, 40], [56, 30], [36, 66], [72, 62]].map(([x, y]) => (
    S(`M${x - 14} ${y + 8} Q${x - 10} ${y - 8} ${x + 4} ${y - 6} Q${x + 14} ${y - 4} ${x + 12} ${y + 4} Q${x + 6} ${y - 2} ${x + 2} ${y + 3} Q${x + 8} ${y + 4} ${x + 12} ${y + 8} Z`, "c1", 2.2)
    + L(`M${x - 6} ${y - 3} Q${x + 2} ${y - 7} ${x + 10} ${y - 2}`, "c2", 2)
  )).join(""),

  /* lugares */
  vila: house(14, 90, 20, 16) + house(54, 86, 24, 18) + house(34, 70, 18, 14) + house(64, 62, 16, 12),
  cidade: S("M6 92 L6 74 L94 74 L94 92 Z", "#a59c90", 2.5) + house(10, 72, 16, 12) + tower(30, 74, 12, 34, "c1", "c2") + house(46, 72, 18, 18)
    + house(68, 72, 18, 14) + L("M6 82 L94 82", "#7f776d", 2) + S("M44 92 L44 82 Q50 76 56 82 L56 92 Z", "k", 0),
  capital: crenelWall(8, 92, 84, 14, "c2") + tower(14, 80, 16, 30, "c1", "c2") + tower(70, 80, 16, 30, "c1", "c2")
    + tower(38, 80, 24, 50, "c1", "c2") + flag(50, 14, "c3", 10) + S("M44 92 L44 82 Q50 75 56 82 L56 92 Z", "k", 0),
  castelo: crenelWall(14, 92, 72, 18) + tower(8, 92, 18, 46, "c2") + tower(74, 92, 18, 46, "c2") + crenelWall(34, 76, 32, 26)
    + flag(17, 34, "c2") + flag(83, 34, "c2") + S("M44 92 L44 80 Q50 72 56 80 L56 92 Z", "k", 0),
  torre: S("M38 92 L40 36 L60 36 L62 92 Z", "c1") + F("M52 36 L60 36 L62 92 L54 92 Z") + S("M38 92 L40 36 L60 36 L62 92 Z", "none")
    + S("M34 38 L50 6 L66 38 Z", "c2") + F("M50 6 L66 38 L52 38 Z", "c2d") + S("M34 38 L50 6 L66 38 Z", "none")
    + S("M46 56 L46 48 Q50 44 54 48 L54 56 Z", "#ffd34d", 2) + S("M46 92 L46 80 Q50 76 54 80 L54 92 Z", "k", 0) + C(50, 5, 3, "#ffd34d", 1.5),
  fortaleza: S("M6 92 L12 52 L88 52 L94 92 Z", "c1") + F("M62 52 L88 52 L94 92 L66 92 Z") + crenelWall(10, 54, 80, 6)
    + tower(40, 52, 20, 22) + S("M40 92 L40 72 Q50 62 60 72 L60 92 Z", "k", 0) + L("M44 92 L44 74 M50 92 L50 68 M56 92 L56 74", "#5a4c40", 2)
    + flag(50, 18, "c2", 12),
  porto: S("M4 76 L60 76 L60 82 L4 82 Z", "c1", 2.5) + L("M10 82 L10 92 M24 82 L24 92 M38 82 L38 92 M52 82 L52 92", "ink", 3)
    + house(10, 76, 20, 14, "#c0553a") + house(34, 76, 16, 12, "#c0553a") + waterLine(90, 56, 96)
    + S("M62 70 L94 70 L88 80 L68 80 Z", "c1", 2.5) + L("M78 70 L78 40", "ink", 2.5) + S("M79 42 L92 62 L79 64 Z", "c2", 2),
  templo: S("M14 40 L50 16 L86 40 Z", "c2") + S("M16 40 L84 40 L84 46 L16 46 Z", "c1", 2.5)
    + [22, 36, 50, 64, 78].map(x => S(`M${x - 3.5} 46 L${x - 3.5} 80 L${x + 3.5} 80 L${x + 3.5} 46 Z`, "c1", 2.2)).join("")
    + S("M12 80 L88 80 L92 88 L8 88 Z", "c1", 2.5) + C(50, 31, 4, "c1", 2),
  santuario: S("M14 26 Q50 16 86 26 L84 32 Q50 24 16 32 Z", "c1", 2.5) + S("M22 38 L78 38 L78 44 L22 44 Z", "c1", 2.5)
    + S("M28 30 L32 30 L34 92 L26 92 Z", "c1", 2.5) + S("M68 30 L72 30 L74 92 L66 92 Z", "c1", 2.5) + S("M12 22 Q50 10 88 22 L88 27 Q50 15 12 27 Z", "c2", 2.2),
  ruinas: S("M16 90 L16 40 L28 40 L28 90 Z", "c1") + S("M14 40 L30 40 L30 34 L14 34 Z", "c1", 2.5) + S("M40 90 L40 58 L46 52 L52 60 L52 90 Z", "c1")
    + S("M64 90 L64 46 L76 46 L76 62 L70 70 L76 76 L76 90 Z", "c1") + S("M8 92 L92 92 L88 86 L12 86 Z", "c1d", 2.2)
    + L("M20 50 q6 6 2 16 q-4 8 4 14 M66 52 q6 4 4 12", "c2", 3) + S("M80 90 L84 80 L92 82 L92 90 Z", "c1", 2),
  acampamento: S("M8 86 L30 42 L52 86 Z", "c1") + F("M30 42 L52 86 L36 86 Z") + S("M8 86 L30 42 L52 86 Z", "none") + S("M24 86 L30 66 L36 86 Z", "k", 0)
    + S("M50 88 L70 52 L90 88 Z", "c1") + F("M70 52 L90 88 L76 88 Z") + S("M50 88 L70 52 L90 88 Z", "none")
    + L("M36 94 L50 88 M44 94 L32 88", "#6b4a2b", 3) + S("M40 88 Q38 78 42 72 Q42 80 46 80 Q46 72 50 70 Q52 80 48 88 Z", "c2", 1.8),
  farol: S("M36 92 L42 26 L58 26 L64 92 Z", "c1") + S("M40 70 L60 70 L61 80 L39 80 Z", "c2", 0) + S("M41 48 L59 48 L60 58 L40 58 Z", "c2", 0)
    + S("M36 92 L42 26 L58 26 L64 92 Z", "none") + S("M40 26 L60 26 L60 14 L40 14 Z", "#ffe680", 2.5) + S("M38 14 L50 4 L62 14 Z", "c2", 2.5)
    + L("M66 18 L92 10 M66 22 L94 24 M34 18 L8 10 M34 22 L6 24", "#ffd34d", 2.5),
  mina: S("M4 90 Q20 40 50 36 Q80 40 96 90 Z", "c1") + F("M50 36 Q80 40 96 90 L70 90 Q72 56 50 36 Z") + S("M4 90 Q20 40 50 36 Q80 40 96 90 Z", "none")
    + S("M34 90 L34 62 L66 62 L66 90 Z", "k", 0) + L("M32 90 L32 58 L68 58 L68 90 M30 58 L70 58", "#9a6a40", 5)
    + S("M70 84 L90 84 L88 92 L72 92 Z", "#7f7a74", 2) + C(76, 80, 4, "c2", 1.6) + C(84, 81, 4, "c2", 1.6),
  moinho: S("M38 92 L42 44 L58 44 L62 92 Z", "c1") + F("M52 44 L58 44 L62 92 L54 92 Z", "c1d") + S("M38 92 L42 44 L58 44 L62 92 Z", "none")
    + S("M36 46 L50 30 L64 46 Z", "c2") + S("M46 92 L46 80 Q50 76 54 80 L54 92 Z", "k", 0)
    + G("translate(50 38)", ...[0, 90, 180, 270].map(a => G(`rotate(${a + 20})`, S("M-3 -4 L-6 -34 L6 -34 L3 -4 Z", "c2", 2), L("M-4 -14 L4 -14 M-5 -24 L5 -24", "ink", 1.5)))),
  ponte: waterLine(84, 6, 94) + S("M4 70 L4 60 L96 60 L96 70 L84 70 Q76 52 66 70 L60 70 Q50 50 40 70 L34 70 Q24 52 16 70 Z", "c1")
    + L("M4 60 L96 60", "c2", 4) + L("M10 60 L10 52 M30 60 L30 52 M50 60 L50 52 M70 60 L70 52 M90 60 L90 52 M10 52 L90 52", "ink", 2.5),
  fabrica: cloudPuff(70, 14, 0.9, "#9a948e") + cloudPuff(36, 22, 0.75, "#aca69f") + S("M62 52 L62 22 L72 22 L72 52 Z", "c1", 2.5) + S("M30 52 L30 30 L38 30 L38 52 Z", "c1", 2.5)
    + S("M8 92 L8 52 L24 40 L24 52 L40 40 L40 52 L56 40 L56 52 L92 52 L92 92 Z", "c1") + F("M8 52 L24 40 L24 52 Z M24 52 L40 40 L40 52 Z M40 52 L56 40 L56 52 Z", "c2")
    + [16, 32, 48, 64, 78].map(x => S(`M${x} 62 L${x + 8} 62 L${x + 8} 72 L${x} 72 Z`, "#ffd34d", 2)).join("") + S("M8 92 L8 52 L92 52 L92 92 Z", "none"),
  caverna: S("M4 92 Q16 30 54 28 Q88 30 96 92 Z", "c1") + F("M54 28 Q88 30 96 92 L74 92 Q76 50 54 28 Z") + S("M4 92 Q16 30 54 28 Q88 30 96 92 Z", "none")
    + S("M30 92 Q32 56 50 54 Q68 56 70 92 Z", "c2", 2.5) + L("M38 58 L40 64 M50 54 L50 61 M62 58 L60 64", "w", 3),

  /* mistérios */
  portal: S("M20 92 L20 44 Q20 12 50 12 Q80 12 80 44 L80 92 L66 92 L66 44 Q66 26 50 26 Q34 26 34 44 L34 92 Z", "c2")
    + S("M34 92 L34 44 Q34 26 50 26 Q66 26 66 44 L66 92 Z", "c1", 2, ";opacity:0.9")
    + L("M50 60 m0 -4 a4 4 0 1 1 -4 4 a9 9 0 0 1 9 -9 a14 14 0 0 1 14 14", "w", 2.5) + L("M26 30 l-4 -4 M74 30 l4 -4 M50 8 l0 -5", "c1", 3),
  obelisco: S("M40 90 L44 22 L50 10 L56 22 L60 90 Z", "c1") + F("M50 10 L56 22 L60 90 L52 90 Z") + S("M40 90 L44 22 L50 10 L56 22 L60 90 Z", "none")
    + S("M32 90 L68 90 L70 96 L30 96 Z", "c1", 2.5) + L("M48 34 L52 38 L48 42 M47 52 L53 52 M50 50 L50 58 M48 66 L52 70 L48 74", "c2", 2.5, ";filter:drop-shadow(0 0 2px var(--c2))"),
  ilhaFlutuante: S("M12 44 Q50 34 88 44 Q74 64 60 72 L52 92 L46 74 Q28 64 12 44 Z", "c2") + F("M60 46 Q74 48 88 44 Q74 64 60 72 L52 92 L54 60 Z", "c2d")
    + S("M12 44 Q50 34 88 44 Q74 64 60 72 L52 92 L46 74 Q28 64 12 44 Z", "none") + S("M10 44 Q50 30 90 44 Q50 52 10 44 Z", "c1", 2.5)
    + roundTree(36, 42, 0.8) + house(56, 42, 14, 9, "#c0553a", "#f2e3c2") + L("M30 58 L28 66 M70 56 L72 64", "#4a8fd0", 2.5),
  estatua: S("M30 96 L70 96 L66 84 L34 84 Z", "c2", 2.5) + S("M40 84 L42 58 L36 50 L38 34 L46 30 L54 30 L62 34 L64 50 L58 58 L60 84 Z", "c1")
    + C(50, 22, 8, "c1") + L("M66 44 L80 14", "#a59c90", 4) + S("M76 18 L84 8 L86 20 Z", "#a59c90", 2) + F("M54 30 L62 34 L64 50 L58 58 L60 84 L52 84 Z", "c1d")
    + S("M40 84 L42 58 L36 50 L38 34 L46 30 L54 30 L62 34 L64 50 L58 58 L60 84 Z", "none"),
  cristalSagrado: L("M50 50 L50 4 M50 50 L90 30 M50 50 L10 30 M50 50 L86 76 M50 50 L14 76", "c2", 2.5, ";opacity:0.75")
    + S("M50 10 L70 40 L50 84 L30 40 Z", "c1") + F("M50 10 L70 40 L50 84 Z", "c1d") + S("M30 40 L70 40", "none", 2.5) + S("M50 10 L70 40 L50 84 L30 40 Z", "none")
    + L("M42 26 L38 36", "w", 3) + E(50, 94, 16, 3.5, "c1", 0, ";opacity:0.45"),
  arvoreMundo: C(50, 36, 48, "c2", 0, ";opacity:0.22") + C(50, 36, 38, "c2", 0, ";opacity:0.22")
    + L("M40 96 Q30 98 20 94 M60 96 Q72 98 82 92 M46 96 Q44 100 38 100 M56 96 Q60 100 66 100", "#5d4430", 3)
    + S("M40 96 Q46 74 42 56 L58 56 Q54 74 60 96 Q70 94 80 98 L20 98 Q30 94 40 96 Z", "#7a5a3a")
    + S("M50 4 C78 2 98 20 92 36 C100 52 82 62 66 56 C60 66 40 66 34 56 C18 62 0 52 8 36 C2 20 22 2 50 4 Z")
    + F("M92 36 C100 52 82 62 66 56 C60 66 40 66 34 56 C50 58 62 50 70 44 C80 46 90 42 92 36 Z", "c1d")
    + S("M30 10 C40 -4 64 -4 72 10 C60 6 42 6 30 10 Z", "c1", 2.5)
    + C(28, 26, 7, "c1l", 0) + C(60, 18, 8, "c1l", 0) + C(78, 34, 6, "c1l", 0) + L("M48 64 Q52 76 48 90 M52 60 Q58 74 54 92", "#5d4430", 2)
    + [[24, 40], [44, 30], [70, 26], [58, 46], [84, 46], [16, 30]].map(([x, y]) => C(x, y, 2.6, "c2", 1.2, ";filter:drop-shadow(0 0 3px var(--c2))")).join(""),
  meteoro: S("M10 6 L64 52 L52 62 Z", "c2", 2, ";opacity:0.85") + S("M24 4 L70 46 L62 54 Z", "#ffe680", 0, ";opacity:0.8")
    + E(66, 82, 30, 9, "#5a4c40", 2.5) + C(66, 66, 16, "c1") + F("M74 54 A16 16 0 0 1 66 82 A14 14 0 0 0 74 54 Z", "c1d") + C(60, 62, 3, "c1l", 0) + C(70, 72, 2.5, "c1l", 0),
  olhoCeu: S("M50 6 L58 30 L74 24 L62 48 L86 60 L60 64 L66 90 L50 70 L34 92 L38 64 L14 62 L38 48 L26 22 L44 30 Z", "c2", 2.5, ";opacity:0.55")
    + S("M50 16 L56 34 L66 32 L58 48 L72 58 L56 60 L60 78 L50 64 L40 80 L42 60 L28 58 L42 48 L34 30 L46 34 Z", "c1", 2.5),

  /* monstros */
  dragao: S("M20 64 Q8 54 12 40 Q16 52 26 54 Q34 40 48 42 L66 30 Q76 22 86 26 L92 24 L88 32 Q92 36 90 40 L80 40 Q74 44 70 52 Q72 64 62 72 L70 88 L62 88 L54 74 Q46 78 38 76 L36 88 L28 88 L30 72 Q22 70 20 64 Z")
    + S("M44 46 Q40 14 18 8 Q30 22 26 30 Q22 26 12 26 Q24 36 34 48 Z", "c2", 2.5) + L("M44 46 Q34 30 18 8 M38 48 Q30 36 12 26", "ink", 1.8)
    + C(84, 31, 2, "k", 0) + L("M84 25 L80 16 M88 25 L90 16", "ink", 2.5) + F("M34 70 Q46 72 56 66 Q50 74 38 74 Z", "c2")
    + S("M20 64 Q8 54 12 40 Q16 52 26 54", "none", 2.5),
  serpente: waterLine(80, 4, 96) + S("M8 78 Q14 54 26 78 Z") + S("M34 78 Q44 46 56 78 Z") + F("M44 54 Q52 62 56 78 L48 78 Q48 64 44 54 Z")
    + S("M34 78 Q44 46 56 78 Z", "none") + S("M62 78 Q66 40 74 30 Q84 22 92 30 L90 38 L80 38 Q74 50 74 78 Z")
    + S("M80 26 L84 16 L88 26 Z", "c2", 2) + S("M72 36 L64 30 L70 44 Z", "c2", 2) + C(86, 30, 2, "k", 0) + L("M92 34 L98 36", "#c43c3c", 2),
  kraken: waterLine(86, 4, 96) + E(50, 56, 22, 26) + F("M64 40 Q74 56 66 74 Q58 80 50 82 Q66 66 64 40 Z", "c1d")
    + C(42, 56, 4.5, "w", 2) + C(58, 56, 4.5, "w", 2) + C(42, 57, 2, "k", 0) + C(58, 57, 2, "k", 0)
    + L("M30 72 Q14 70 12 54 Q12 44 20 44 M70 72 Q86 70 88 54 Q88 44 80 44 M36 80 Q30 92 18 90 M64 80 Q70 92 82 90", "ink", 8)
    + L("M30 72 Q14 70 12 54 Q12 44 20 44 M70 72 Q86 70 88 54 Q88 44 80 44 M36 80 Q30 92 18 90 M64 80 Q70 92 82 90", "c1", 5)
    + C(14, 58, 1.6, "c2", 0) + C(86, 58, 1.6, "c2", 0),
  golem: S("M30 92 L32 72 L26 70 L22 44 L34 34 L66 34 L78 44 L74 70 L68 72 L70 92 L56 92 L54 74 L46 74 L44 92 Z")
    + S("M36 34 L38 14 L62 14 L64 34 Z", "c1") + F("M62 14 L64 34 L78 44 L74 70 L68 72 L70 92 L60 92 L62 40 Z")
    + S("M30 92 L32 72 L26 70 L22 44 L34 34 L66 34 L78 44 L74 70 L68 72 L70 92 L56 92 L54 74 L46 74 L44 92 Z", "none")
    + S("M42 22 L48 22 L48 26 L42 26 Z", "c2", 0, ";filter:drop-shadow(0 0 3px var(--c2))") + S("M52 22 L58 22 L58 26 L52 26 Z", "c2", 0, ";filter:drop-shadow(0 0 3px var(--c2))")
    + L("M40 46 L48 54 L44 62 M60 44 L56 52", "ink", 2) + S("M47 46 L53 46 L53 52 L47 52 Z", "c2", 1.5),
  geleia: S("M14 84 Q10 60 30 46 Q42 22 52 22 Q50 34 62 40 Q88 50 86 84 Z") + F("M62 40 Q88 50 86 84 L66 84 Q78 62 62 40 Z")
    + S("M14 84 Q10 60 30 46 Q42 22 52 22 Q50 34 62 40 Q88 50 86 84 Z", "none") + E(36, 46, 5, 8, "c2", 0, ";opacity:0.7")
    + E(42, 64, 4, 6, "k", 0) + E(60, 64, 4, 6, "k", 0) + L("M44 76 Q51 82 58 76", "ink", 2.5),
  ave: S("M50 52 Q30 28 4 30 Q20 38 22 44 Q12 46 8 52 Q30 52 42 60 Z") + S("M50 52 Q70 28 96 30 Q80 38 78 44 Q88 46 92 52 Q70 52 58 60 Z")
    + E(50, 58, 9, 16, "c1") + C(50, 40, 7, "c1") + S("M47 40 L50 50 L53 40 Z", "#e6b84a", 1.5) + S("M44 72 L50 88 L56 72 Z", "c1", 2.5)
    + F("M8 52 Q30 52 42 60 L46 54 Q30 46 22 44 Z M92 52 Q70 52 58 60 L54 54 Q70 46 78 44 Z", "c2") + C(47, 38, 1.4, "k", 0) + C(53, 38, 1.4, "k", 0),
  fera: S("M14 64 Q12 46 28 42 L56 40 Q62 28 72 28 L80 22 L82 30 Q90 34 90 42 L80 46 Q74 48 72 56 L74 86 L66 86 L62 62 L36 64 L36 86 L28 86 L26 66 Q18 68 14 64 Z")
    + F("M36 64 L62 62 L66 86 L74 86 L72 56 Q60 60 36 58 Z") + S("M14 64 Q12 46 28 42 L56 40 Q62 28 72 28 L80 22 L82 30 Q90 34 90 42 L80 46 Q74 48 72 56 L74 86 L66 86 L62 62 L36 64 L36 86 L28 86 L26 66 Q18 68 14 64 Z", "none")
    + L("M14 56 Q4 50 6 38", "ink", 4) + C(80, 34, 2, "c2", 0) + L("M86 42 L82 46 L88 46", "w", 1.8) + S("M28 42 Q34 34 44 40 Q52 34 58 40 Z", "c1d", 2),
  demonio: S("M50 28 Q20 6 6 26 Q22 24 28 36 Q14 42 14 56 Q30 46 38 54 Z", "c1") + S("M50 28 Q80 6 94 26 Q78 24 72 36 Q86 42 86 56 Q70 46 62 54 Z", "c1")
    + S("M32 40 Q30 72 50 86 Q70 72 68 40 Q60 30 50 30 Q40 30 32 40 Z", "c1") + F("M58 32 Q68 38 68 40 Q70 72 50 86 Q64 66 58 32 Z", "c1d")
    + S("M36 36 Q28 22 32 10 Q38 22 44 31 Z", "#f2ead8", 2) + S("M64 36 Q72 22 68 10 Q62 22 56 31 Z", "#f2ead8", 2)
    + S("M38 50 L46 52 L44 56 Z", "c2", 1.5, ";filter:drop-shadow(0 0 2px var(--c2))") + S("M62 50 L54 52 L56 56 Z", "c2", 1.5, ";filter:drop-shadow(0 0 2px var(--c2))")
    + L("M42 68 L46 66 L50 70 L54 66 L58 68", "ink", 2.2),
  fantasma: S("M24 88 L24 44 Q24 14 50 14 Q76 14 76 44 L76 88 L68 80 L60 90 L50 80 L40 90 L32 80 Z", "c1") + F("M64 18 Q76 26 76 44 L76 88 L68 80 L64 84 Q72 50 64 18 Z", "c2", ";opacity:0.35")
    + S("M24 88 L24 44 Q24 14 50 14 Q76 14 76 44 L76 88 L68 80 L60 90 L50 80 L40 90 L32 80 Z", "none")
    + E(41, 42, 5, 8, "c2", 0) + E(59, 42, 5, 8, "c2", 0) + E(50, 62, 6, 7, "c2", 0),
  caveira: S("M24 46 Q24 14 50 14 Q76 14 76 46 Q76 58 66 62 L66 74 L34 74 L34 62 Q24 58 24 46 Z", "c1")
    + C(40, 44, 8, "c2", 0) + C(60, 44, 8, "c2", 0) + S("M50 52 L45 62 L55 62 Z", "c2", 0) + L("M42 74 L42 66 M50 74 L50 66 M58 74 L58 66", "ink", 2.5)
    + L("M12 80 L88 96 M88 80 L12 96", "ink", 7) + L("M12 80 L88 96 M88 80 L12 96", "c1", 4),
  olho: L("M38 74 Q34 84 40 94 M50 76 Q52 86 46 96 M62 74 Q68 82 62 92", "ink", 6) + L("M38 74 Q34 84 40 94 M50 76 Q52 86 46 96 M62 74 Q68 82 62 92", "c1", 3.5)
    + C(50, 44, 34, "c1") + F("M72 20 A34 34 0 0 1 50 78 A30 30 0 0 0 72 20 Z", "c1d") + E(50, 44, 22, 16, "c2", 2.5)
    + C(50, 44, 11, "#c43c3c", 2) + E(50, 44, 3.5, 9, "k", 0) + C(45, 39, 2.5, "w", 0),
  aranha: L("M36 50 L14 34 L6 50 M36 56 L12 56 L4 72 M38 62 L18 76 L14 92 M64 50 L86 34 L94 50 M64 56 L88 56 L96 72 M62 62 L82 76 L86 92", "ink", 4)
    + E(50, 66, 18, 20, "c1") + C(50, 40, 11, "c1") + S("M50 58 L45 66 L50 74 L55 66 Z", "c2", 0) + C(45, 37, 2.2, "c2", 0) + C(55, 37, 2.2, "c2", 0) + C(50, 43, 1.8, "c2", 0),
  colosso: S("M8 86 L12 56 Q14 38 34 36 L60 34 Q66 22 80 26 Q92 30 92 44 L86 56 L80 56 L78 86 L68 86 L66 62 L32 64 L30 86 L20 86 L20 66 Z")
    + F("M32 64 L66 62 L68 86 L78 86 L80 56 Q62 58 32 56 Z") + S("M8 86 L12 56 Q14 38 34 36 L60 34 Q66 22 80 26 Q92 30 92 44 L86 56 L80 56 L78 86 L68 86 L66 62 L32 64 L30 86 L20 86 L20 66 Z", "none")
    + S("M74 28 Q62 6 46 12 Q58 14 66 30 Z", "c2", 2.2) + S("M84 28 Q96 10 88 4 Q90 16 80 26 Z", "c2", 2.2) + C(82, 40, 2.3, "#ffd34d", 0),
  fogoFatuo: S("M50 92 Q24 84 28 60 Q32 44 44 32 Q42 46 50 50 Q50 30 62 16 Q60 36 70 48 Q80 60 74 76 Q68 90 50 92 Z", "c1", 2.5, ";opacity:0.9")
    + S("M50 84 Q36 78 40 64 Q44 56 50 54 Q52 64 58 66 Q64 72 60 80 Q56 86 50 84 Z", "c2", 0) + C(46, 70, 2, "k", 0) + C(56, 70, 2, "k", 0),

  /* veículos */
  navio: waterLine(88, 6, 94) + S("M10 66 L90 66 L80 84 L22 84 Z", "c1") + F("M60 66 L90 66 L80 84 L62 84 Z") + S("M10 66 L90 66 L80 84 L22 84 Z", "none")
    + L("M36 66 L36 10 M64 66 L64 18", "ink", 3) + S("M24 18 Q36 26 48 18 L50 44 Q36 52 22 44 Z", "c2", 2.5) + S("M54 24 Q64 30 74 24 L76 52 Q64 58 52 52 Z", "c2", 2.5)
    + flag(36, 12, "#c43c3c", 8) + L("M16 72 L84 72", "c1d", 2),
  barco: waterLine(80, 10, 90) + S("M16 62 L84 62 Q78 76 50 78 Q22 76 16 62 Z", "c1") + L("M50 62 L50 18", "ink", 3) + S("M52 20 L76 56 L52 56 Z", "c2", 2.5) + S("M48 26 L30 56 L48 56 Z", "c2", 2.5),
  aeronave: E(50, 34, 40, 18) + F("M74 20 Q92 30 88 40 Q78 52 50 52 Q76 44 74 20 Z") + E(50, 34, 40, 18, "none")
    + L("M20 30 L80 30 M18 40 L82 40", "c1d", 2) + L("M34 50 L30 62 M66 50 L70 62", "ink", 2.5)
    + S("M22 62 L78 62 L70 76 L30 76 Z", "c2", 2.5) + S("M78 64 L94 56 L94 74 Z", "c1", 2) + S("M4 30 L12 34 L4 38 Z M8 24 L16 30 M8 44 L16 38", "c1", 2)
    + [36, 50, 64].map(x => C(x, 69, 2.5, "#ffd34d", 1.5)).join(""),
  trem: cloudPuff(24, 18, 0.9, "#b8b2ab") + S("M10 72 L10 46 L54 46 L54 72 Z", "c1") + S("M54 72 L54 30 L86 30 L86 72 Z", "c1") + S("M18 46 L18 30 L28 30 L28 46 Z", "c1", 2.5)
    + S("M50 30 L90 30 L90 24 L50 24 Z", "c2", 2.5) + S("M60 38 L80 38 L80 52 L60 52 Z", "#ffe680", 2) + S("M6 72 L92 72 L92 66 L6 66 Z", "c2", 2)
    + C(22, 80, 8, "#3a3a3a") + C(44, 80, 8, "#3a3a3a") + C(70, 80, 8, "#3a3a3a") + S("M4 72 L10 60 L10 72 Z", "c2", 2),
  balao: S("M50 6 Q86 6 84 40 Q82 58 60 70 L40 70 Q18 58 16 40 Q14 6 50 6 Z") + F("M50 6 Q62 30 60 70 L40 70 Q38 30 50 6 Z", "c2")
    + S("M50 6 Q86 6 84 40 Q82 58 60 70 L40 70 Q18 58 16 40 Q14 6 50 6 Z", "none") + L("M40 70 L42 80 M60 70 L58 80", "ink", 2)
    + S("M40 80 L60 80 L58 92 L42 92 Z", "#9a6a40", 2.5),

  /* marcadores */
  alfinete: S("M50 94 Q24 58 24 38 A26 26 0 0 1 76 38 Q76 58 50 94 Z") + F("M66 18 A26 26 0 0 1 76 38 Q76 58 50 94 Q70 54 66 18 Z") + S("M50 94 Q24 58 24 38 A26 26 0 0 1 76 38 Q76 58 50 94 Z", "none") + C(50, 38, 10, "c2", 2.5),
  estrela: S("M50 6 L61 37 L94 38 L68 58 L77 90 L50 71 L23 90 L32 58 L6 38 L39 37 Z") + F("M50 6 L61 37 L94 38 L68 58 L77 90 L50 71 Z") + S("M50 6 L61 37 L94 38 L68 58 L77 90 L50 71 L23 90 L32 58 L6 38 L39 37 Z", "none") + L("M44 30 L40 42", "c2", 3),
  tesouro: L("M20 20 L80 80 M80 20 L20 80", "ink", 18) + L("M20 20 L80 80 M80 20 L20 80", "c1", 12),
  bau: S("M10 50 Q10 24 50 24 Q90 24 90 50 Z", "c1") + S("M10 50 L90 50 L90 86 L10 86 Z", "c1") + F("M64 26 Q90 30 90 50 L90 86 L70 86 L70 50 Q72 34 64 26 Z")
    + L("M28 26 L28 86 M72 26 L72 86 M10 50 L90 50", "c2", 5) + S("M10 50 L90 50 L90 86 L10 86 Z", "none") + S("M44 48 L56 48 L56 62 L44 62 Z", "c2", 2.5),
  bandeira: L("M26 94 L26 8", "ink", 6) + L("M26 94 L26 8", "c2", 3) + S("M28 12 Q46 4 60 12 Q74 20 88 12 L88 50 Q74 58 60 50 Q46 42 28 50 Z")
    + F("M60 12 Q74 20 88 12 L88 50 Q74 58 60 50 Z") + S("M28 12 Q46 4 60 12 Q74 20 88 12 L88 50 Q74 58 60 50 Q46 42 28 50 Z", "none") + C(26, 8, 4, "#e6b84a", 2),
  batalha: S("M18 10 L24 8 L78 70 L72 76 Z", "c1", 2.5) + S("M82 10 L76 8 L22 70 L28 76 Z", "c1", 2.5)
    + L("M64 68 L80 84 M36 68 L20 84", "c2", 6) + L("M60 78 L74 64 M40 78 L26 64", "ink", 5) + C(84, 88, 5, "c2", 2) + C(16, 88, 5, "c2", 2),
  coroa: S("M12 76 L8 30 L30 50 L50 18 L70 50 L92 30 L88 76 Z") + F("M50 18 L70 50 L92 30 L88 76 L56 76 Z") + S("M12 76 L8 30 L30 50 L50 18 L70 50 L92 30 L88 76 Z", "none")
    + S("M12 76 L88 76 L88 88 L12 88 Z", "c1", 2.5) + C(50, 62, 6, "c2", 2) + C(28, 66, 4, "#3f6fb0", 2) + C(72, 66, 4, "#3f9a6a", 2) + C(50, 16, 4, "c2", 2),
  interrogacao: C(50, 50, 42) + L("M36 38 Q36 22 50 22 Q66 22 66 36 Q66 46 54 52 Q50 54 50 62", "c2", 9) + C(50, 76, 5.5, "c2", 0),
  exclamacao: S("M50 8 L94 88 L6 88 Z") + F("M50 8 L94 88 L60 88 Z") + S("M50 8 L94 88 L6 88 Z", "none") + S("M45 34 L55 34 L53 64 L47 64 Z", "c2", 0) + C(50, 75, 5, "c2", 0),
  lar: C(50, 50, 42) + S("M26 52 L50 28 L74 52 L68 52 L68 74 L32 74 L32 52 Z", "c2", 2.5) + S("M45 74 L45 60 L55 60 L55 74 Z", "c1", 2),
  missao: S("M20 16 L80 16 Q86 16 86 24 L86 76 Q86 86 76 86 L22 86 Q14 86 14 78 L14 22 Q14 16 20 16 Z", "c1")
    + L("M26 34 L74 34 M26 46 L74 46 M26 58 L60 58", "#8a7b6b", 3) + C(68, 72, 11, "c2", 2.5) + L("M62 82 L58 96 M74 82 L78 96", "c2", 4),
  rosa: C(50, 50, 30, "none", 2) + C(50, 50, 22, "none", 1.2)
    + S("M50 4 L56 44 L50 50 L44 44 Z", "c1", 2) + S("M50 96 L56 56 L50 50 L44 56 Z", "c1", 2)
    + S("M4 50 L44 44 L50 50 L44 56 Z", "c1", 2) + S("M96 50 L56 44 L50 50 L56 56 Z", "c1", 2)
    + F("M50 4 L56 44 L50 50 Z M96 50 L56 56 L50 50 Z M50 96 L44 56 L50 50 Z M4 50 L44 44 L50 50 Z", "c2")
    + S("M50 24 L54 46 L50 50 Z M76 50 L54 54 L50 50 Z M50 76 L46 54 L50 50 Z M24 50 L46 46 L50 50 Z", "c2", 1, ";opacity:0.9")
    + C(50, 50, 4, "c2", 1.5) + `<text x="50" y="3" text-anchor="middle" style="font:bold 9px serif;fill:var(--c1);dominant-baseline:hanging">N</text>`
};

/** Inject the sprite into the document once (hidden), so stamps can <use href="#mmfu-st-key">. */
export function ensureSprite(doc = document) {
  if ( doc.getElementById("mmfu-sprite") ) return;
  const symbols = Object.entries(STAMP_SVG).map(([key, body]) => `<symbol id="mmfu-st-${key}" viewBox="0 0 100 100" overflow="visible">${body}</symbol>`).join("");
  const holder = doc.createElement("div");
  holder.id = "mmfu-sprite";
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0">${symbols}</svg>`;
  doc.body.append(holder);
}

/** Drawings may spill a little outside their 100 x 100 box (smoke, halos): images keep this margin. */
export const STAMP_PAD = 15;

/** Colour variables of a stamp with explicit values (an image cannot inherit the page's CSS). */
export function stampVars(c1, c2, ink = "#2f2620") {
  return { c1, c2, c3: "#4f9fd6", ink, c1d: shade(c1, -0.28), c1l: shade(c1, 0.4), c2d: shade(c2, -0.28) };
}

/** A standalone SVG string for one stamp, with STAMP_PAD units of margin on every side. */
export function standaloneStamp(key, vars) {
  const body = STAMP_SVG[key] ?? "";
  const style = Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(";");
  const p = STAMP_PAD, size = 100 + p * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-p} ${-p} ${size} ${size}" width="${size}" height="${size}" style="${style}">${body}</svg>`;
}

const urlCache = new Map();

/** Where a stamp's picture comes from: the module's image file (Wonderdraft) or a drawing in these colours. */
export function stampSrc(key, c1, c2) {
  const meta = STAMPS[key];
  if ( meta?.img ) return `${PATH}/${meta.img}`;
  return stampURL(key, c1 ?? meta?.c1 ?? "#8c7b6b", c2 ?? meta?.c2 ?? "#f4f7fb");
}

/** Data URL of a stamp in given colours. Same stamp + colours = same URL, decoded once by the browser. */
export function stampURL(key, c1, c2) {
  const id = `${key}|${c1}|${c2}`;
  let url = urlCache.get(id);
  if ( !url ) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(standaloneStamp(key, stampVars(c1, c2)))}`;
    urlCache.set(id, url);
  }
  return url;
}
