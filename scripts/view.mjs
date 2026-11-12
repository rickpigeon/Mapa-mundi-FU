/**
 * Mapa-mundi-FU: the map view (framework-free DOM). It draws a map (normalizeMap shape) inside a stage
 * with pan and zoom, and knows nothing about tools or saving: the window (map-app.mjs) drives it.
 *
 * Layers, bottom to top, all inside .mmfu-world (2400 x 1600 map units, CSS-transformed):
 *   paper (sea colour, texture)  >  under SVG (own image base)  >  land canvas (coast ripples, cliffs, land fills,
 *   inner shading, coast glow: drawn once, so zooming does not redraw them)
 *   >  paint canvas + live canvas  >  grain  >  base SVG (coastline, grid, rhumb lines, frame, header, scale, compass)
 *   >  vector SVG (regions, routes)  >  deco (waves, clouds)  >  fx  >  objects (stamps, names)  >  ui SVG (selection, ruler, pings)
 */
import { CELL, MAP_H, MAP_W, escapeHTML, hashSeed, rng, shade } from "./constants.mjs";
import { AREA_FX, ELEMENTS, ROUTE_STYLES, STAMPS, THEMES, THREATS } from "./catalog.mjs";
import { buildLandmasses, centroid, decodeLoop, landAt, landPath, pairs, polygonArea, smoothPath } from "./geometry.mjs";
import { generateLoops } from "./generator.mjs";
import { SHEET_MAPS } from "./data/sheet-maps.mjs";
import { PaintLayer } from "./paint.mjs";
import { ensureSprite, stampURL } from "./stamps-svg.mjs";

const NS = "http://www.w3.org/2000/svg";
const MIN_SCALE = 0.08, MAX_SCALE = 6;
const f1 = v => Math.round(v * 10) / 10;
const polyArea = pts => Math.abs(polygonArea(pts));
const attr = v => escapeHTML(v);
/* inline text attributes (the PNG export cannot see the stylesheet) */
const HDR_L = `font-family="Signika, 'Trebuchet MS', sans-serif" font-size="24" font-weight="700" letter-spacing="1"`;
const HDR_V = `font-family="Signika, 'Trebuchet MS', sans-serif" font-size="26" font-weight="400"`;
const NAME_STYLE = "font-family:Signika, 'Trebuchet MS', sans-serif;font-weight:700;letter-spacing:2px;paint-order:stroke;stroke-linejoin:round;";

/* ---------------------------------------------------------------------------------------------- */
/* Base geometry (cached per base)                                                                  */
/* ---------------------------------------------------------------------------------------------- */

const geometryCache = new Map();

export function baseGeometry(map) {
  const b = map.base;
  const key = b.kind === "gerado" ? `g|${b.seed}|${JSON.stringify(b.gen)}|${map.style.landTension}` : `${b.kind}|${map.style.landTension}`;
  if ( geometryCache.has(key) ) return geometryCache.get(key);
  let loops = [];
  if ( b.kind === "folha1" || b.kind === "folha2" ) loops = SHEET_MAPS[b.kind].map(decodeLoop);
  else if ( b.kind === "gerado" ) loops = generateLoops({ seed: b.seed, ...b.gen });
  /* land ids differ per base so colours given on one base do not leak onto another */
  const lands = buildLandmasses(loops, b.kind === "gerado" ? `G${b.seed.toString(36)}_` : b.kind === "folha1" ? "B" : "L");
  for ( const land of lands ) land.d = landPath(land, map.style.landTension);
  const geo = { key, lands, allD: lands.map(l => l.d).join("") };
  geometryCache.set(key, geo);
  if ( geometryCache.size > 12 ) geometryCache.delete(geometryCache.keys().next().value);
  return geo;
}

export function themeOf(map) {
  const t = THEMES[map.style.theme] ?? THEMES.folha;
  return { ...t, sea: map.style.sea ?? t.sea, land: map.style.land ?? t.land, coast: map.style.coast ?? t.coast };
}

/* ---------------------------------------------------------------------------------------------- */
/* Texture tiles for the paper                                                                      */
/* ---------------------------------------------------------------------------------------------- */

const textureCache = new Map();
export function textureURL(kind) {
  if ( textureCache.has(kind) ) return textureCache.get(kind);
  let url = "";
  try {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const r = rng(hashSeed(kind));
    if ( kind === "paper" || kind === "parchment" ) {
      const img = ctx.createImageData(size, size);
      for ( let i = 0; i < size * size; i++ ) {
        const n = r();
        const v = kind === "paper" ? 120 + n * 60 : 90 + n * 80;
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v * 0.92;
        img.data[i * 4 + 2] = v * 0.8;
        img.data[i * 4 + 3] = kind === "paper" ? n * 26 : n * 34;
      }
      ctx.putImageData(img, 0, 0);
      if ( kind === "parchment" ) {
        for ( let k = 0; k < 14; k++ ) {
          const x = r() * size, y = r() * size, rad = 20 + r() * 50;
          const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
          g.addColorStop(0, "rgba(120, 80, 30, 0.10)");
          g.addColorStop(1, "rgba(120, 80, 30, 0)");
          ctx.fillStyle = g;
          for ( const dx of [-size, 0, size] ) for ( const dy of [-size, 0, size] ) {
            ctx.save(); ctx.translate(dx, dy); ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        }
        ctx.strokeStyle = "rgba(110, 80, 40, 0.10)";
        ctx.lineWidth = 0.8;
        for ( let k = 0; k < 40; k++ ) {
          const x = r() * size, y = r() * size;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); ctx.stroke();
        }
      }
    }
    else if ( kind === "stars" ) {
      for ( let k = 0; k < 70; k++ ) {
        const a = 0.25 + r() * 0.75;
        ctx.fillStyle = `rgba(255, 248, 220, ${a})`;
        ctx.beginPath(); ctx.arc(r() * size, r() * size, r() < 0.9 ? 0.7 : 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    else if ( kind === "scan" ) {
      ctx.fillStyle = "rgba(41, 243, 209, 0.06)";
      for ( let y = 0; y < size; y += 4 ) ctx.fillRect(0, y, size, 1);
    }
    else return "";
    url = c.toDataURL();
  } catch ( err ) {
    url = "";
  }
  textureCache.set(kind, url);
  return url;
}

/* ---------------------------------------------------------------------------------------------- */
/* Text measuring for curved names                                                                  */
/* ---------------------------------------------------------------------------------------------- */

let measureCtx = null;
function measureChars(text, font) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  measureCtx.font = font;
  return [...text].map(ch => measureCtx.measureText(ch).width);
}

export function labelFont(o) {
  return `${o.italic ? "italic " : ""}${o.bold ? "700" : "400"} ${o.size}px "${String(o.font).replace(/"/g, "")}", Signika, sans-serif`;
}

export function labelText(o) {
  const t = String(o.text ?? "");
  return o.caps ? t.toLocaleUpperCase("pt-BR") : t;
}

/** Letter positions of a name: [{ ch, x, y, rot }] relative to the name's centre, plus the box size. */
export function layoutLabel(o) {
  const text = labelText(o);
  const chars = [...text];
  const widths = measureChars(text, labelFont(o));
  const gap = o.spacing * o.size;
  const total = widths.reduce((s, w) => s + w, 0) + gap * Math.max(0, chars.length - 1);
  const out = [];
  let cursor = -total / 2;
  const c = (o.curve ?? 0) / 100;
  const radius = Math.abs(c) > 0.01 ? total / (Math.abs(c) * Math.PI) : 0;
  let minY = 0, maxY = 0;
  chars.forEach((ch, i) => {
    const w = widths[i];
    const mid = cursor + w / 2;
    let x = mid, y = 0, rot = 0;
    if ( radius ) {
      const th = mid / radius;
      x = radius * Math.sin(th);
      const sag = radius * (1 - Math.cos(th));
      y = c > 0 ? sag : -sag;
      rot = (c > 0 ? -th : th) * 180 / Math.PI;
    }
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    out.push({ ch, x, y, rot, w });
    cursor += w + gap;
  });
  /* centre vertically on the arc */
  const shift = (minY + maxY) / 2;
  for ( const l of out ) l.y -= shift;
  return { letters: out, width: Math.max(total, o.size * 0.5), height: o.size * 1.25 + (maxY - minY) };
}

function outlineShadow(color, w) {
  if ( !w ) return "none";
  const d = w, k = f1(w * 0.72);
  return [`${d}px 0`, `-${d}px 0`, `0 ${d}px`, `0 -${d}px`, `${k}px ${k}px`, `-${k}px ${k}px`, `${k}px -${k}px`, `-${k}px -${k}px`]
    .map(s => `${s} 0 ${color}`).join(", ");
}

const GRADIENT_FX = new Set(["dourado", "arcoiris", "fogo", "gelo"]);
const GLOW_FX = new Set(["brilho", "fogo", "gelo", "eletrico", "sombra", "runas", "arcano", "cintilar", "dourado"]);

/* ---------------------------------------------------------------------------------------------- */
/* The view                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

export class MapView {
  constructor(root, { res = 1.5, onView = null } = {}) {
    ensureSprite(root.ownerDocument);
    this.root = root;
    this.onView = onView;
    this.view = { x: 0, y: 0, s: 0.5 };
    this.map = null;
    this.geo = null;
    this.baseKey = "";
    this.objectKeys = new Map();
    this.opts = { gm: false, showHidden: false, selection: new Set() };
    root.classList.add("mmfu-stage");
    root.innerHTML = `
      <div class="mmfu-world">
        <div class="mmfu-paper"></div>
        <svg class="mmfu-under" xmlns="${NS}" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none"></svg>
        <canvas class="mmfu-landc"></canvas>
        <canvas class="mmfu-paint"></canvas>
        <canvas class="mmfu-live"></canvas>
        <div class="mmfu-grain"></div>
        <svg class="mmfu-baseover" xmlns="${NS}" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none"></svg>
        <svg class="mmfu-vec" xmlns="${NS}" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none"><defs></defs><g class="mmfu-regions"></g><g class="mmfu-routes"></g></svg>
        <div class="mmfu-deco"></div>
        <div class="mmfu-fxl"></div>
        <div class="mmfu-objl"></div>
        <svg class="mmfu-ui" xmlns="${NS}" viewBox="0 0 ${MAP_W} ${MAP_H}" preserveAspectRatio="none">
          <g class="mmfu-sel"></g><g class="mmfu-draft"></g><g class="mmfu-ruler"></g><g class="mmfu-pings"></g><circle class="mmfu-cursor" r="0"/>
        </svg>
      </div>
      <div class="mmfu-tip" hidden></div>`;
    this.world = root.querySelector(".mmfu-world");
    this.paper = root.querySelector(".mmfu-paper");
    this.under = root.querySelector(".mmfu-under");
    this.landCanvas = root.querySelector(".mmfu-landc");
    this.grain = root.querySelector(".mmfu-grain");
    this.baseOver = root.querySelector(".mmfu-baseover");
    this.vec = root.querySelector(".mmfu-vec");
    this.vecDefs = this.vec.querySelector("defs");
    this.regionsG = this.vec.querySelector(".mmfu-regions");
    this.routesG = this.vec.querySelector(".mmfu-routes");
    this.deco = root.querySelector(".mmfu-deco");
    this.fxLayer = root.querySelector(".mmfu-fxl");
    this.objLayer = root.querySelector(".mmfu-objl");
    this.ui = root.querySelector(".mmfu-ui");
    this.selG = this.ui.querySelector(".mmfu-sel");
    this.draftG = this.ui.querySelector(".mmfu-draft");
    this.rulerG = this.ui.querySelector(".mmfu-ruler");
    this.pingG = this.ui.querySelector(".mmfu-pings");
    this.cursor = this.ui.querySelector(".mmfu-cursor");
    this.tip = root.querySelector(".mmfu-tip");
    this.paint = new PaintLayer(root.querySelector(".mmfu-paint"), root.querySelector(".mmfu-live"), res);
    this.applyView();
  }

  /* ---------------- view (pan / zoom) ---------------- */

  applyView() {
    const { x, y, s } = this.view;
    this.world.style.transform = `translate(${f1(x)}px, ${f1(y)}px) scale(${s})`;
    /* only the overlay needs the zoom (constant-size handles); setting it higher would restyle every object */
    this.ui.style.setProperty("--mmfu-inv", String(1 / s));
    this.tip.hidden = true;
    /* while panning/zooming the map is one composited layer (smooth); afterwards it is redrawn sharp */
    this.world.classList.add("is-moving");
    clearTimeout(this.movingTimer);
    this.movingTimer = setTimeout(() => this.world.classList.remove("is-moving"), 260);
    this.onView?.(this.view);
  }

  fitScale() {
    const w = this.root.clientWidth || 800, h = this.root.clientHeight || 600;
    return Math.min(w / MAP_W, h / MAP_H) * 0.96;
  }

  fit() {
    const w = this.root.clientWidth || 800, h = this.root.clientHeight || 600;
    const s = this.fitScale();
    this.view = { s, x: (w - MAP_W * s) / 2, y: (h - MAP_H * s) / 2 };
    this.applyView();
  }

  setView(v) {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(v.s) || this.view.s));
    this.view = { x: Number(v.x) || 0, y: Number(v.y) || 0, s };
    this.applyView();
  }

  zoomAt(factor, clientX, clientY) {
    const rect = this.root.getBoundingClientRect();
    const px = (clientX ?? rect.left + rect.width / 2) - rect.left, py = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.view.s * factor));
    const k = s / this.view.s;
    this.view = { s, x: px - (px - this.view.x) * k, y: py - (py - this.view.y) * k };
    this.applyView();
  }

  panBy(dx, dy) {
    this.view = { ...this.view, x: this.view.x + dx, y: this.view.y + dy };
    this.applyView();
  }

  /** Centre the stage on a map point, optionally at a zoom relative to the fit (1 = fit). */
  centerOn(x, y, zoom = null) {
    const w = this.root.clientWidth || 800, h = this.root.clientHeight || 600;
    const s = zoom ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.fitScale() * zoom)) : this.view.s;
    this.view = { s, x: w / 2 - x * s, y: h / 2 - y * s };
    this.applyView();
  }

  /** Map point at the centre of the stage and the zoom relative to the fit. */
  viewCenter() {
    const w = this.root.clientWidth || 800, h = this.root.clientHeight || 600;
    return { x: (w / 2 - this.view.x) / this.view.s, y: (h / 2 - this.view.y) / this.view.s, zoom: this.view.s / this.fitScale() };
  }

  toMap(clientX, clientY) {
    const rect = this.root.getBoundingClientRect();
    return [(clientX - rect.left - this.view.x) / this.view.s, (clientY - rect.top - this.view.y) / this.view.s];
  }

  toScreen(x, y) {
    return [x * this.view.s + this.view.x, y * this.view.s + this.view.y];
  }

  /* ---------------- data ---------------- */

  /**
   * Draw a map. `opts`: { gm, showHidden (GM sees hidden things dimmed), selection: Set of ids }.
   */
  setMap(map, opts = {}) {
    this.map = map;
    Object.assign(this.opts, opts);
    const t = themeOf(map);
    const baseKey = JSON.stringify([map.base, map.style, map.info, map.lands]);
    if ( baseKey !== this.baseKey ) {
      this.baseKey = baseKey;
      this.renderBase(map, t);
    }
    this.renderObjects();
  }

  visible(o) {
    return !o.hidden || this.opts.showHidden;
  }

  hitLand(x, y) {
    if ( !this.geo ) return null;
    return landAt(this.geo.lands, x, y)?.id ?? null;
  }

  /* ---------------- base ---------------- */

  renderBase(map, t) {
    const geo = this.geo = baseGeometry(map);
    const d = geo.allD;
    const decor = map.style.decor;
    const imageBase = map.base.kind === "imagem" && map.base.image;

    /* paper */
    const tex = t.texture === "stars" || t.texture === "scan" ? textureURL(t.texture) : "";
    const grad = map.style.theme === "ceu"
      ? `linear-gradient(180deg, ${t.sea2} 0%, ${t.sea} 100%)`
      : `radial-gradient(ellipse at 50% 45%, ${t.sea} 35%, ${t.sea2} 100%)`;
    this.paper.style.background = `${tex ? `url(${tex}) repeat, ` : ""}${grad}`;
    this.paper.style.backgroundColor = t.sea;
    const grainURL = t.texture === "paper" || t.texture === "parchment" ? textureURL(t.texture) : "";
    this.grain.style.backgroundImage = grainURL ? `url(${grainURL})` : "none";
    this.world.style.setProperty("--mmfu-ink", t.ink);
    this.world.style.setProperty("--mmfu-accent", t.accent);
    this.world.style.setProperty("--mmfu-paper", t.paper);
    this.root.dataset.theme = map.style.theme;

    /* own image base (SVG keeps it sharp) */
    let under = "";
    if ( imageBase ) {
      const fit = map.base.imageFit === "stretch" ? "none" : map.base.imageFit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
      under += `<image href="${attr(map.base.image)}" x="0" y="0" width="${MAP_W}" height="${MAP_H}" preserveAspectRatio="${fit}"/>`;
    }
    this.under.innerHTML = under;
    this.drawLand(map, t);

    /* the paint layer clips to this land */
    this.paint.setLand(d || null);

    /* over: coastline, grid, rhumb lines, frame, header, scale, compass */
    let over = "";
    if ( d ) {
      over += `<path class="mmfu-coast" d="${d}" fill="none" stroke="${t.coast}" stroke-width="${t.coastW}" stroke-linejoin="round"/>`;
    }
    if ( decor.rhumb ) {
      let rays = "";
      for ( let i = 0; i < 32; i++ ) {
        const a = (i / 32) * Math.PI * 2;
        rays += `M${MAP_W / 2} ${MAP_H / 2}L${f1(MAP_W / 2 + Math.cos(a) * 1500)} ${f1(MAP_H / 2 + Math.sin(a) * 1500)}`;
      }
      over += `<path d="${rays}" stroke="${t.rhumb}" stroke-width="1.6" stroke-opacity="0.55" fill="none"/>`;
    }
    if ( decor.grid ) {
      let lines = "";
      for ( let x = CELL; x < MAP_W; x += CELL ) lines += `M${x} 0V${MAP_H}`;
      for ( let y = CELL; y < MAP_H; y += CELL ) lines += `M0 ${y}H${MAP_W}`;
      over += `<path d="${lines}" stroke="${t.grid}" stroke-opacity="${t.gridA}" stroke-width="1.6" fill="none"/>`
        + `<path d="M${MAP_W / 2} 0V${MAP_H}M0 ${MAP_H / 2}H${MAP_W}" stroke="${t.grid}" stroke-opacity="${Math.min(1, t.gridA * 1.8)}" stroke-width="2.2" fill="none"/>`;
    }
    if ( decor.frame ) {
      over += `<rect x="10" y="10" width="${MAP_W - 20}" height="${MAP_H - 20}" fill="none" stroke="${t.frame}" stroke-width="5" rx="10"/>`
        + `<rect x="22" y="22" width="${MAP_W - 44}" height="${MAP_H - 44}" fill="none" stroke="${t.frame}" stroke-width="1.6" rx="6"/>`;
    }
    if ( decor.header ) over += this.headerSVG(map, t);
    if ( decor.scale ) over += this.scaleSVG(map, t);
    if ( decor.compass ) {
      over += `<g class="mmfu-compass" transform="translate(54 1366) scale(1.8)" style="--c1:${t.ink};--c2:${t.accent};--ink:${t.ink};--c1d:${shade(t.ink, -0.2)};--c2d:${shade(t.accent, -0.25)}"><use href="#mmfu-st-rosa" width="100" height="100"/></g>`;
    }
    this.baseOver.innerHTML = over;

    this.renderDeco(map, t);
  }

  /**
   * Coast ripples, cliffs, land fills, inner shading and coast glow on a canvas. These soft layers are costly
   * to redraw as SVG at every zoom step; as a bitmap they are drawn once per change. The coastline itself stays
   * a sharp SVG stroke on top.
   */
  drawLand(map = this.map, t = themeOf(map)) {
    const c = this.landCanvas;
    const res = this.paint.res;
    c.width = Math.round(MAP_W * res);
    c.height = Math.round(MAP_H * res);
    const ctx = c.getContext("2d");
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    const geo = this.geo;
    if ( !geo?.allD ) return;
    const all = new Path2D(geo.allD);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if ( map.style.decor.rings ) {
      for ( const [w, color, alpha] of [...t.rings].reverse() ) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = w * 2;
        ctx.stroke(all);
      }
      ctx.globalAlpha = 1;
    }
    if ( t.cliff ) {
      ctx.save();
      ctx.translate(0, 34);
      ctx.fillStyle = shade(t.cliff, -0.35);
      ctx.fill(all, "evenodd");
      ctx.translate(0, -16);
      ctx.fillStyle = t.cliff;
      ctx.fill(all, "evenodd");
      ctx.strokeStyle = shade(t.cliff, -0.5);
      ctx.lineWidth = 2;
      ctx.stroke(all);
      ctx.restore();
    }
    for ( const land of geo.lands ) {
      land.path2d ??= new Path2D(land.d);
      ctx.fillStyle = map.lands[land.id] ?? t.land;
      ctx.fill(land.path2d, "evenodd");
    }
    if ( t.inner ) {
      ctx.save();
      ctx.clip(all, "evenodd");
      ctx.strokeStyle = t.inner;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 40;
      ctx.stroke(all);
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 16;
      ctx.stroke(all);
      ctx.restore();
    }
    if ( t.glow ) {
      ctx.strokeStyle = t.coast;
      ctx.globalAlpha = 0.12;
      ctx.lineWidth = t.coastW * 6;
      ctx.stroke(all);
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = t.coastW * 3;
      ctx.stroke(all);
      ctx.globalAlpha = 1;
    }
  }

  /** Sharper or lighter bitmaps (paint and land) for this computer. */
  setResolution(res) {
    this.paint.setResolution(res);
    if ( this.map ) this.drawLand();
  }

  headerSVG(map, t) {
    const i = map.info;
    const field = (label, value, x, w) => `<text x="${x}" y="61" ${HDR_L}>${escapeHTML(label)}</text>`
      + `<text x="${x + label.length * 15 + 14}" y="61" ${HDR_V}>${escapeHTML(value)}</text>`
      + `<path d="M${x + label.length * 15 + 8} 66H${x + w}" stroke="${t.frame}" stroke-width="1.4"/>`;
    return `<g class="mmfu-header" style="fill:${t.ink}">
      <rect x="40" y="24" width="1180" height="58" rx="22" fill="${t.paper}" fill-opacity="0.82" stroke="${t.frame}" stroke-width="2.4"/>
      ${field("MUNDO:", i.world, 70, 470)}${field("MAPA Nº", i.number, 560, 160)}${field("REGIÃO:", i.region, 740, 460)}
    </g>`;
  }

  scaleSVG(map, t) {
    const len = CELL * map.style.dayCells;
    const n = len > 260 ? 1 : len > 130 ? 2 : 3;
    const right = MAP_W - 60, left = right - n * len;
    let ticks = "", nums = "";
    for ( let k = 0; k <= n; k++ ) {
      ticks += `M${f1(left + k * len)} 70V84`;
      if ( n > 1 ) nums += `<text x="${f1(left + k * len)}" y="104" text-anchor="middle" ${HDR_V} font-size="18">${k}</text>`;
    }
    return `<g class="mmfu-scale" style="fill:${t.ink}">
      <text x="${f1((left + right) / 2)}" y="58" text-anchor="middle" ${HDR_L}>${n === 1 ? "UM DIA DE VIAGEM" : "DIAS DE VIAGEM"}</text>${nums}
      <path d="M${f1(left - 70)} 70H${right}" stroke="${t.ink}" stroke-width="2.4"/>
      <path d="${ticks}" stroke="${t.ink}" stroke-width="2.4"/>
      <path d="M${right} 62L${right + 10} 70L${right} 78L${right - 10} 70Z" fill="${t.paper}" stroke="${t.ink}" stroke-width="2.4"/>
    </g>`;
  }

  /** Animated waves in open sea and drifting clouds. */
  renderDeco(map, t) {
    const decor = map.style.decor;
    let html = "";
    if ( decor.waves ) {
      const r = rng(hashSeed(this.geo.key) ^ 0x9e3779b9);
      const ctx = document.createElement("canvas").getContext("2d");
      const land = this.geo.allD ? new Path2D(this.geo.allD) : null;
      ctx.lineWidth = 90;
      const waveColor = map.style.theme === "folha" ? t.coast : shade(t.sea, ["noite", "sombrio", "tecno", "jrpg"].includes(map.style.theme) ? 0.45 : -0.3);
      let n = 0;
      for ( let tries = 0; tries < 900 && n < 46; tries++ ) {
        const x = 70 + r() * (MAP_W - 140), y = 110 + r() * (MAP_H - 180);
        if ( land && (ctx.isPointInPath(land, x, y, "evenodd") || ctx.isPointInStroke(land, x, y)) ) continue;
        n++;
        html += `<div class="mmfu-wave" style="left:${f1(x)}px;top:${f1(y)}px;--d:${f1(r() * -6)}s;--k:${f1(0.8 + r() * 0.6)}">`
          + `<svg viewBox="0 0 40 12"><path d="M2 8q6 -8 12 0q6 8 12 0q6 -8 12 0" fill="none" stroke="${waveColor}" stroke-width="2.4" stroke-linecap="round"/></svg></div>`;
      }
    }
    if ( decor.clouds ) {
      const r = rng(7);
      for ( let k = 0; k < 7; k++ ) {
        html += `<div class="mmfu-cloud" style="top:${f1(80 + r() * (MAP_H - 260))}px;--w:${f1(220 + r() * 260)}px;--dur:${f1(90 + r() * 90)}s;--d:${f1(-r() * 160)}s;--o:${f1(0.35 + r() * 0.35)}"></div>`;
      }
    }
    if ( decor.vignette ) html += `<div class="mmfu-vignette"></div>`;
    this.deco.innerHTML = html;
  }

  /* ---------------- objects ---------------- */

  renderObjects() {
    const map = this.map;
    if ( !map ) return;
    const seen = new Set();
    const regions = [], routes = [];
    let zf = 0, zo = 0;
    for ( const o of map.objects ) {
      if ( !this.visible(o) ) continue;
      if ( o.type === "region" ) { regions.push(o); continue; }
      if ( o.type === "route" ) { routes.push(o); continue; }
      seen.add(o.id);
      const key = JSON.stringify(o) + (this.opts.selection.has(o.id) ? "s" : "");
      let el = this.objectKeys.get(o.id)?.el;
      const layer = o.type === "fx" ? this.fxLayer : this.objLayer;
      if ( !el || this.objectKeys.get(o.id).key !== key ) {
        const fresh = this.buildObject(o);
        if ( el ) el.replaceWith(fresh);
        el = fresh;
        this.objectKeys.set(o.id, { el, key });
      }
      /* keep array order = stacking order */
      const index = o.type === "fx" ? zf++ : zo++;
      if ( el.parentElement !== layer || layer.children[index] !== el ) layer.insertBefore(el, layer.children[index] ?? null);
    }
    for ( const [id, rec] of this.objectKeys ) {
      if ( !seen.has(id) ) {
        rec.el.remove();
        this.objectKeys.delete(id);
      }
    }
    this.renderVectors(regions, routes);
  }

  buildObject(o) {
    const div = document.createElement("div");
    div.dataset.id = o.id;
    div.className = `mmfu-o mmfu-${o.type}${o.hidden ? " is-hidden" : ""}${this.opts.selection.has(o.id) ? " is-selected" : ""}${o.link ? " has-link" : ""}`;
    if ( o.type === "stamp" ) this.fillStamp(div, o);
    else if ( o.type === "label" ) this.fillLabel(div, o);
    else if ( o.type === "fx" ) this.fillFx(div, o);
    return div;
  }

  fillStamp(div, o) {
    const meta = STAMPS[o.key];
    const s = o.size;
    div.classList.add(`sfx-${o.fx}`);
    div.style.cssText = `left:${f1(o.x - s / 2)}px;top:${f1(o.y - s / 2)}px;width:${s}px;height:${s}px;`
      + `--c1:${o.color ?? meta.c1};--c2:${o.color2 ?? meta.c2};--rot:${o.rot}deg;--flip:${o.flip ? -1 : 1};opacity:${o.opacity};`
      + `--d:${f1((hashSeed(o.id) % 1000) / -300)}s;--fs:${f1(Math.max(20, s * 0.24))}px`;
    let html = "";
    if ( o.aura && ELEMENTS[o.aura] ) html += this.manaHTML(o.aura, o.id, s * 0.75, false);
    html += `<div class="mmfu-sw"><img class="mmfu-sv" src="${stampURL(o.key, o.color ?? meta.c1, o.color2 ?? meta.c2)}" alt="" draggable="false"></div>`;
    if ( o.showName && o.name ) html += `<div class="mmfu-sname">${escapeHTML(o.name)}</div>`;
    div.innerHTML = html;
  }

  fillLabel(div, o) {
    this.whenFontReady(o);
    const lay = layoutLabel(o);
    const gradient = GRADIENT_FX.has(o.fx);
    const shadow = outlineShadow(o.outline, o.outlineW);
    div.classList.add(`lfx-${o.fx}`);
    if ( o.curve ) div.classList.add("is-curved");
    div.style.cssText = `left:${f1(o.x)}px;top:${f1(o.y)}px;--rot:${o.rot}deg;font:${labelFont(o)};color:${o.color};`
      + `--fxc:${o.fxColor};--ol:${o.outline};--olw:${o.outlineW}px;opacity:${o.opacity};width:${f1(lay.width)}px;height:${f1(lay.height)}px;`
      + `--d:${f1((hashSeed(o.id) % 1000) / -300)}s`;
    const letters = lay.letters.map((l, i) => {
      const ch = l.ch === " " ? "&nbsp;" : escapeHTML(l.ch);
      return `<span class="ch" style="--i:${i};left:${f1(l.x + lay.width / 2)}px;top:${f1(l.y + lay.height / 2)}px;--r:${f1(l.rot)}deg">${ch}</span>`;
    }).join("");
    const main = `<div class="ml-m" style="${gradient ? "" : `text-shadow:${shadow};`}">${letters}</div>`;
    const glow = GLOW_FX.has(o.fx) ? `<div class="ml-g" aria-hidden="true">${letters}</div>` : "";
    let sparks = "";
    if ( o.fx === "cintilar" ) {
      const r = rng(hashSeed(o.id));
      for ( let k = 0; k < 7; k++ ) sparks += `<span class="ml-spark" style="left:${f1(r() * 100)}%;top:${f1(r() * 100)}%;--i:${k}"></span>`;
    }
    div.innerHTML = `<div class="ml-w">${glow}${main}${sparks}</div>`;
  }

  /** Names are measured letter by letter: once a font finishes loading, measure its names again. */
  whenFontReady(o) {
    const font = labelFont(o);
    let ready = true;
    try {
      ready = document.fonts.check(font);
    } catch ( err ) {
      ready = true;
    }
    if ( ready ) return;
    this.fontWaits ??= new Set();
    if ( this.fontWaits.has(font) ) return;
    this.fontWaits.add(font);
    document.fonts.load(font).then(() => {
      for ( const [id, rec] of this.objectKeys ) if ( rec.el.classList.contains("mmfu-label") ) rec.key = "";
      this.renderObjects();
    }).catch(() => null);
  }

  manaHTML(element, id, radius = 60, icon = true) {
    const info = ELEMENTS[element];
    const r = rng(hashSeed(id) ^ 0x51ed);
    let p = "";
    for ( let k = 0; k < 7; k++ ) p += `<span class="p" style="--i:${k};--x:${f1(14 + r() * 72)}%;--y:${f1(20 + r() * 60)}%"></span>`;
    return `<div class="mmfu-mana e-${element}" style="--fxc:${info.color};--r:${f1(radius)}px"><span class="a-aura"></span><span class="a-veil"></span>${p}`
      + `${icon ? `<span class="a-icon"><i class="${info.icon}"></i></span>` : ""}</div>`;
  }

  fillFx(div, o) {
    const meta = AREA_FX[o.kind];
    const fxc = o.kind === "mana" ? ELEMENTS[o.element].color : (o.color ?? meta.color);
    div.classList.add(`k-${o.kind}`);
    if ( o.kind === "mana" ) div.classList.add(`e-${o.element}`);
    div.style.cssText = `left:${f1(o.x - o.r)}px;top:${f1(o.y - o.r)}px;width:${o.r * 2}px;height:${o.r * 2}px;--r:${o.r}px;--fxc:${fxc}`;
    const r = rng(hashSeed(o.id));
    const counts = {
      mana: [6, 9, 14], nevoa: [3, 5, 7], tempestade: [3, 4, 6], redemoinho: [3, 4, 5], aurora: [3, 4, 5], brilho: [8, 14, 22],
      fumaca: [4, 6, 9], chuva: [10, 18, 28], neve: [10, 18, 28], miasma: [5, 8, 12], farol: [0, 0, 0], portal: [3, 3, 3],
      brasas: [8, 14, 22], estrelas: [2, 4, 6], pulso: [2, 3, 3], bolhas: [6, 10, 16]
    }[o.kind] ?? [6, 9, 14];
    const n = counts[Math.round(o.intensity) - 1] ?? counts[1];
    let html = `<span class="a-aura"></span><span class="a-veil"></span>`;
    if ( o.kind === "farol" ) html += `<span class="a-beam"></span><span class="a-beam b2"></span>`;
    if ( o.kind === "redemoinho" ) {
      let arms = "";
      for ( let a = 0; a < 3; a++ ) {
        let d = "";
        for ( let k = 0; k <= 40; k++ ) {
          const th = (k / 40) * Math.PI * 3.2 + (a * Math.PI * 2) / 3, rr = 6 + k * 1.05;
          d += `${k ? "L" : "M"}${f1(Math.cos(th) * rr)} ${f1(Math.sin(th) * rr)}`;
        }
        arms += `<path d="${d}"/>`;
      }
      html += `<svg class="a-spiral" viewBox="-50 -50 100 100">${arms}</svg>`;
    }
    if ( o.kind === "portal" ) html += `<span class="a-core"></span>`;
    for ( let k = 0; k < n; k++ ) {
      const ang = r() * Math.PI * 2, dist = Math.sqrt(r()) * 0.4;
      const x = 50 + Math.cos(ang) * dist * 100, y = 50 + Math.sin(ang) * dist * 100;
      html += `<span class="p" style="--i:${k};--n:${n};--x:${f1(x)}%;--y:${f1(y)}%;--q:${f1(r())};--d:${f1(-r() * 8)}s"></span>`;
    }
    if ( o.kind === "mana" && o.showIcon ) html += `<span class="a-icon"><i class="${ELEMENTS[o.element].icon}"></i></span>`;
    if ( o.kind !== "mana" && o.showIcon ) html += `<span class="a-icon"><i class="${meta.icon}"></i></span>`;
    div.innerHTML = html;
  }

  /* ---------------- regions and routes ---------------- */

  renderVectors(regions, routes) {
    const t = themeOf(this.map);
    let defs = "";
    let reg = "";
    for ( const o of regions ) {
      const pts = pairs(o.pts);
      const d = smoothPath(pts, true, o.smooth ? 0.5 : 0);
      const cls = `mmfu-region${o.hidden ? " is-hidden" : ""}${this.opts.selection.has(o.id) ? " is-selected" : ""}`;
      let fill = o.color, fillOpacity = o.opacity;
      if ( !["liso", "nenhum"].includes(o.pattern) ) {
        const pid = `mmfu-pat-${o.id}`;
        const lines = {
          hachura: `<path d="M-4 20L20 -4M0 24L24 0" stroke="${o.color}" stroke-width="3"/>`,
          cruzado: `<path d="M-4 20L20 -4M0 24L24 0M-4 0L20 24M0 -4L24 20" stroke="${o.color}" stroke-width="2.4"/>`,
          pontos: `<circle cx="6" cy="6" r="2.6" fill="${o.color}"/><circle cx="16" cy="16" r="2.6" fill="${o.color}"/>`,
          listras: `<path d="M0 5H20M0 15H20" stroke="${o.color}" stroke-width="3"/>`
        }[o.pattern];
        defs += `<pattern id="${pid}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${o.color}" fill-opacity="${f1(o.opacity * 0.45)}"/>${lines}</pattern>`;
        fill = `url(#${pid})`;
        fillOpacity = Math.min(1, o.opacity * 2.4);
      }
      if ( o.pattern === "nenhum" ) fillOpacity = 0;
      const dash = { tracejada: `${o.borderW * 3} ${o.borderW * 2}`, pontilhada: `0.1 ${o.borderW * 2.2}`, continua: "", brilho: "", nenhuma: "" }[o.border];
      let g = `<g class="${cls}" data-id="${o.id}">`;
      if ( o.border === "brilho" ) g += `<path class="r-glow" d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.borderW * 4}" stroke-opacity="0.3" stroke-linejoin="round"/>`;
      g += `<path class="r-body" d="${d}" fill="${fill}" fill-opacity="${f1(fillOpacity * 100) / 100}" fill-rule="evenodd"`
        + (o.border === "nenhuma" || !o.borderW ? ` stroke="none"` : ` stroke="${o.color}" stroke-width="${o.borderW}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ""}`)
        + `/>`;
      if ( o.showName && o.name ) {
        const [cx, cy] = centroid(pts);
        g += `<text class="r-name" x="${f1(cx)}" y="${f1(cy)}" text-anchor="middle" dominant-baseline="middle" style="${NAME_STYLE}font-size:${f1(Math.max(22, Math.min(64, Math.sqrt(polyArea(pts)) * 0.09)))}px;stroke-width:6px;fill:${shade(o.color, -0.35)};stroke:${t.paper}">${escapeHTML(o.name)}</text>`;
      }
      reg += `${g}</g>`;
    }
    let rts = "";
    for ( const o of routes ) {
      const pts = pairs(o.pts);
      const d = smoothPath(pts, false, o.smooth ? 0.5 : 0);
      const w = o.width;
      const pid = `mmfu-rp-${o.id}`;
      const cls = `mmfu-route st-${o.style}${o.animated ? " is-anim" : ""}${o.hidden ? " is-hidden" : ""}${this.opts.selection.has(o.id) ? " is-selected" : ""}`;
      let marker = "";
      if ( o.arrow ) {
        defs += `<marker id="mmfu-ar-${o.id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10Z" fill="${o.color}"/></marker>`;
        marker = ` marker-end="url(#mmfu-ar-${o.id})"`;
      }
      const dark = shade(o.color, -0.35), light = shade(o.color, 0.45);
      let body = "";
      switch ( o.style ) {
        case "estrada":
          body = `<path d="${d}" stroke="${dark}" stroke-width="${w + 4}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
            + `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${marker}/>`;
          break;
        case "trilha":
          body = `<path id="${pid}" class="r-dash" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="0.1 ${w * 2.4}"${marker}/>`;
          break;
        case "maritima":
        case "aerea":
        case "viagem":
          if ( o.style === "aerea" ) body += `<path d="${d}" stroke="${dark}" stroke-width="${w + 3}" stroke-opacity="0.45" fill="none" stroke-linecap="round" stroke-dasharray="${w * 3} ${w * 2.2}" class="r-dash"/>`;
          body += `<path id="${pid}" class="r-dash" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${w * 3} ${w * 2.2}"${marker}/>`;
          break;
        case "rio":
          body = `<path d="${d}" stroke="${dark}" stroke-width="${w + 3}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
            + `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${marker}/>`
            + `<path class="r-dash r-flow" d="${d}" stroke="${light}" stroke-width="${Math.max(1, w * 0.3)}" fill="none" stroke-linecap="round" stroke-dasharray="${w * 2} ${w * 4}"/>`;
          break;
        case "fronteira":
          body = `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-dasharray="${w * 4} ${w * 1.6} ${w * 0.4} ${w * 1.6}"${marker}/>`;
          break;
        case "ferrovia":
          body = `<path d="${d}" stroke="${o.color}" stroke-width="${w * 2.6}" fill="none" stroke-dasharray="${Math.max(1.5, w * 0.45)} ${w * 1.3}"/>`
            + `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${Math.max(1, w * 0.5)}" fill="none"${marker}/>`;
          break;
        case "ley":
          body = `<path d="${d}" stroke="${o.color}" stroke-width="${w * 4}" stroke-opacity="0.18" fill="none" stroke-linecap="round" class="r-pulse"/>`
            + `<path id="${pid}" d="${d}" stroke="${light}" stroke-width="${w}" fill="none" stroke-linecap="round"${marker}/>`
            + `<path class="r-dash" d="${d}" stroke="#ffffff" stroke-width="${Math.max(1, w * 0.6)}" fill="none" stroke-linecap="round" stroke-dasharray="0.1 ${w * 6}"/>`;
          break;
        case "muralha":
          body = `<path d="${d}" stroke="${dark}" stroke-width="${w + 4}" fill="none" stroke-linejoin="round"/>`
            + `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none" stroke-linejoin="round"${marker}/>`
            + `<path d="${d}" stroke="${dark}" stroke-width="${w * 0.45}" fill="none" stroke-dasharray="${w * 0.7} ${w * 0.7}"/>`;
          break;
        default:
          body = `<path id="${pid}" d="${d}" stroke="${o.color}" stroke-width="${w}" fill="none"${marker}/>`;
      }
      let name = "";
      if ( o.showName && o.name ) {
        name = `<text class="r-name r-along" dy="${-(w + 8)}" style="${NAME_STYLE}font-size:${f1(Math.max(28, w * 4))}px;stroke-width:6px;fill:${dark};stroke:${t.paper}"><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${escapeHTML(o.name)}</textPath></text>`;
      }
      rts += `<g class="${cls}" data-id="${o.id}" style="--w:${w}"><path class="r-hit" d="${d}" stroke="transparent" stroke-width="${Math.max(24, w * 3)}" fill="none"/>${body}${name}</g>`;
    }
    this.vecDefs.innerHTML = defs;
    this.regionsG.innerHTML = reg;
    this.routesG.innerHTML = rts;
  }

  /* ---------------- selection, drafts, ruler, pings ---------------- */

  /** Axis-aligned box of an object in map units (for selection frames). */
  bounds(o) {
    if ( o.type === "stamp" ) return { x: o.x - o.size / 2, y: o.y - o.size / 2, w: o.size, h: o.size };
    if ( o.type === "fx" ) return { x: o.x - o.r, y: o.y - o.r, w: o.r * 2, h: o.r * 2 };
    if ( o.type === "label" ) {
      const el = this.objectKeys.get(o.id)?.el;
      const w = el?.offsetWidth || o.size * 4, h = el?.offsetHeight || o.size * 1.3;
      return { x: o.x - w / 2, y: o.y - h / 2, w, h };
    }
    const pts = pairs(o.pts);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }

  /** Selection frames and handles. Handle sizes stay constant on screen. */
  renderSelection(objects) {
    const k = 1 / this.view.s;
    const hs = 7 * k;
    let html = "";
    for ( const o of objects ) {
      const b = this.bounds(o);
      if ( o.type === "route" || o.type === "region" ) {
        const pts = pairs(o.pts);
        html += pts.map(([x, y], i) => `<rect class="h-vertex" data-handle="v" data-index="${i}" data-id="${o.id}" x="${f1(x - hs)}" y="${f1(y - hs)}" width="${f1(hs * 2)}" height="${f1(hs * 2)}" rx="${f1(hs * 0.4)}"/>`).join("");
        const n = o.type === "region" ? pts.length : pts.length - 1;
        for ( let i = 0; i < n; i++ ) {
          const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
          html += `<circle class="h-mid" data-handle="m" data-index="${i}" data-id="${o.id}" cx="${f1((x0 + x1) / 2)}" cy="${f1((y0 + y1) / 2)}" r="${f1(hs * 0.7)}"/>`;
        }
        continue;
      }
      const pad = 4 * k;
      html += `<rect class="h-frame" x="${f1(b.x - pad)}" y="${f1(b.y - pad)}" width="${f1(b.w + pad * 2)}" height="${f1(b.h + pad * 2)}" style="stroke-width:${f1(1.6 * k)};stroke-dasharray:${f1(6 * k)} ${f1(4 * k)}"/>`;
      if ( o.type === "fx" ) {
        html += `<circle class="h-ring" cx="${f1(o.x)}" cy="${f1(o.y)}" r="${f1(o.r)}" style="stroke-width:${f1(1.4 * k)}"/>`;
        html += `<rect class="h-scale" data-handle="r" data-id="${o.id}" x="${f1(o.x + o.r - hs)}" y="${f1(o.y - hs)}" width="${f1(hs * 2)}" height="${f1(hs * 2)}"/>`;
      }
      else {
        html += `<rect class="h-scale" data-handle="s" data-id="${o.id}" x="${f1(b.x + b.w + pad - hs)}" y="${f1(b.y + b.h + pad - hs)}" width="${f1(hs * 2)}" height="${f1(hs * 2)}"/>`;
        html += `<line class="h-stem" x1="${f1(b.x + b.w / 2)}" y1="${f1(b.y - pad)}" x2="${f1(b.x + b.w / 2)}" y2="${f1(b.y - pad - 22 * k)}" style="stroke-width:${f1(1.4 * k)}"/>`;
        html += `<circle class="h-rot" data-handle="t" data-id="${o.id}" cx="${f1(b.x + b.w / 2)}" cy="${f1(b.y - pad - 22 * k)}" r="${f1(hs)}"/>`;
      }
    }
    this.selG.innerHTML = html;
    this.selG.style.setProperty("--k", String(k));
  }

  /** Route/region being drawn, rubber-band selection box, bucket hover... `svg` is trusted markup. */
  setDraft(svg = "") {
    this.draftG.innerHTML = svg;
  }

  setCursor(x, y, r) {
    if ( r == null ) {
      this.cursor.setAttribute("r", "0");
      return;
    }
    this.cursor.setAttribute("cx", f1(x));
    this.cursor.setAttribute("cy", f1(y));
    this.cursor.setAttribute("r", f1(r));
  }

  setRuler(pts, text) {
    if ( !pts?.length ) {
      this.rulerG.innerHTML = "";
      return;
    }
    const k = 1 / this.view.s;
    const d = `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}`;
    const [lx, ly] = pts[pts.length - 1];
    const lines = String(text).split("\n");
    const fs = 15 * k;
    const w = Math.max(...lines.map(l => l.length)) * fs * 0.56 + 18 * k, h = lines.length * fs * 1.3 + 12 * k;
    this.rulerG.innerHTML = `<path d="${d}" class="ru-line" style="stroke-width:${f1(3 * k)};stroke-dasharray:${f1(10 * k)} ${f1(6 * k)}"/>`
      + pts.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 * k)}" class="ru-dot"/>`).join("")
      + `<g transform="translate(${f1(lx + 14 * k)} ${f1(ly + 14 * k)})"><rect class="ru-box" width="${f1(w)}" height="${f1(h)}" rx="${f1(6 * k)}"/>`
      + lines.map((l, i) => `<text class="ru-text" x="${f1(9 * k)}" y="${f1(6 * k + (i + 0.95) * fs * 1.3 - fs * 0.25)}" style="font-size:${f1(fs)}px">${escapeHTML(l)}</text>`).join("")
      + `</g>`;
  }

  ping(x, y, color = "#ffd34d", label = "") {
    const k = 1 / this.view.s;
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "mmfu-ping");
    g.style.setProperty("--pc", color);
    g.innerHTML = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(60 * k)}" class="pg-ring"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(60 * k)}" class="pg-ring pg-2"/>`
      + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(9 * k)}" class="pg-dot"/>`
      + (label ? `<text x="${f1(x)}" y="${f1(y - 22 * k)}" text-anchor="middle" class="pg-label" style="font-size:${f1(15 * k)}px">${escapeHTML(label)}</text>` : "");
    this.pingG.append(g);
    setTimeout(() => g.remove(), 2600);
  }

  /* ---------------- tooltip ---------------- */

  showTip(o, clientX, clientY, { gm = false } = {}) {
    if ( !o ) {
      this.tip.hidden = true;
      return;
    }
    const title = o.type === "label" ? o.text : o.name;
    const kind = o.type === "stamp" ? STAMPS[o.key]?.label
      : o.type === "fx" ? (o.kind === "mana" ? `Mana latente: ${ELEMENTS[o.element].label}` : AREA_FX[o.kind]?.label)
        : o.type === "route" ? ROUTE_STYLES[o.style]?.label
          : o.type === "region" ? "Região" : "";
    const threat = o.type === "region" && o.threat ? `<div class="tp-threat">Ameaça: ${THREATS[o.threat].label} (d${THREATS[o.threat].die})</div>` : "";
    const note = o.note ? `<div class="tp-note">${escapeHTML(o.note)}</div>` : "";
    const gmNote = gm && o.gmNote ? `<div class="tp-gm"><i class="fa-solid fa-eye-slash"></i> ${escapeHTML(o.gmNote)}</div>` : "";
    const link = o.link ? `<div class="tp-link"><i class="fa-solid fa-book-open"></i> Clique para abrir</div>` : "";
    const hidden = gm && o.hidden ? `<div class="tp-hidden"><i class="fa-solid fa-eye-slash"></i> Escondido dos jogadores</div>` : "";
    if ( !title && !note && !threat && !gmNote && !link && !hidden && o.type !== "fx" ) {
      this.tip.hidden = true;
      return;
    }
    this.tip.innerHTML = `${title ? `<div class="tp-title">${escapeHTML(title)}</div>` : ""}${kind ? `<div class="tp-kind">${escapeHTML(kind)}</div>` : ""}${threat}${note}${gmNote}${link}${hidden}`;
    this.tip.hidden = false;
    const rect = this.root.getBoundingClientRect();
    const x = clientX - rect.left + 16, y = clientY - rect.top + 16;
    const w = this.tip.offsetWidth, h = this.tip.offsetHeight;
    this.tip.style.left = `${Math.min(x, rect.width - w - 8)}px`;
    this.tip.style.top = `${y + h > rect.height - 8 ? Math.max(8, clientY - rect.top - h - 12) : y}px`;
  }
}
