/**
 * Mapa-mundi-FU: the paint layer (a canvas the size of the map). Strokes are stored as data and replayed,
 * so the painting is resolution independent and every client draws the same thing.
 *
 * Stroke: { t: "b" brush | "x" texture | "e" eraser, c: colour, w: width (map units), o: opacity 0-1,
 *           s: softness 0-1, m: "a" anywhere | "l" land only | "s" sea only, x: texture key, p: points }
 * Points are encoded with geometry.encodePoints(pts, 2) (half-unit precision).
 */
import { MAP_H, MAP_W, color as asColor, rng, shade } from "./constants.mjs";
import { decodePoints } from "./geometry.mjs";

export const POINT_SCALE = 2;
const TILE = 64;

/* ---------------------------------------------------------------------------------------------- */
/* Texture tiles                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

const tileCache = new Map();

/** Draw `fn(ctx, dx, dy)` 9 times so marks crossing the tile edge wrap around seamlessly. */
function wrapped(ctx, fn) {
  for ( const dx of [-TILE, 0, TILE] ) for ( const dy of [-TILE, 0, TILE] ) fn(dx, dy);
}

function tileFor(key, hex) {
  const id = `${key}|${hex}`;
  if ( tileCache.has(id) ) return tileCache.get(id);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  const ink = shade(hex, -0.38);
  const light = shade(hex, 0.35);
  const r = rng(key.length * 7919 + 13);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const spots = (n, minDist = 10) => {
    const out = [];
    for ( let tries = 0; out.length < n && tries < 400; tries++ ) {
      const p = [r() * TILE, r() * TILE];
      if ( out.every(q => {
        const dx = Math.min(Math.abs(p[0] - q[0]), TILE - Math.abs(p[0] - q[0]));
        const dy = Math.min(Math.abs(p[1] - q[1]), TILE - Math.abs(p[1] - q[1]));
        return Math.hypot(dx, dy) >= minDist;
      }) ) out.push(p);
    }
    return out;
  };
  switch ( key ) {
    case "floresta":
      for ( const [x, y] of spots(6, 20) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, 8, 0, Math.PI * 2);
        ctx.fillStyle = hex; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = ink; ctx.stroke();
        ctx.beginPath(); ctx.arc(x + dx - 2.5, y + dy - 2.5, 2.6, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy + 8); ctx.lineTo(x + dx, y + dy + 12); ctx.strokeStyle = ink; ctx.stroke();
      });
      break;
    case "pinheiros":
      for ( const [x, y] of spots(7, 18) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy - 10); ctx.lineTo(x + dx - 6.5, y + dy + 6); ctx.lineTo(x + dx + 6.5, y + dy + 6); ctx.closePath();
        ctx.fillStyle = hex; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy + 6); ctx.lineTo(x + dx, y + dy + 9); ctx.stroke();
      });
      break;
    case "grama":
      ctx.strokeStyle = hex; ctx.lineWidth = 1.6;
      for ( const [x, y] of spots(14, 9) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx - 3, y + dy - 4); ctx.lineTo(x + dx, y + dy + 2); ctx.lineTo(x + dx + 3, y + dy - 5); ctx.stroke();
      });
      break;
    case "colinas":
      ctx.lineWidth = 2;
      for ( const [x, y] of spots(5, 22) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx - 11, y + dy + 4); ctx.quadraticCurveTo(x + dx, y + dy - 12, x + dx + 11, y + dy + 4);
        ctx.fillStyle = hex; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
      });
      break;
    case "dunas":
      ctx.strokeStyle = hex; ctx.lineWidth = 2;
      for ( let row = 0; row < 4; row++ ) {
        const y = row * 16 + 6;
        ctx.beginPath(); ctx.moveTo(-4, y);
        for ( let x = 0; x <= TILE + 8; x += 16 ) ctx.quadraticCurveTo(x - 8, y - 6 + (row % 2) * 3, x, y);
        ctx.stroke();
      }
      break;
    case "pantano":
      ctx.strokeStyle = hex; ctx.lineWidth = 1.6;
      for ( const [x, y] of spots(7, 16) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx - 8, y + dy + 3); ctx.lineTo(x + dx + 8, y + dy + 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy + 3); ctx.lineTo(x + dx, y + dy - 5);
        ctx.moveTo(x + dx - 3, y + dy + 3); ctx.lineTo(x + dx - 5, y + dy - 3);
        ctx.moveTo(x + dx + 3, y + dy + 3); ctx.lineTo(x + dx + 5, y + dy - 3); ctx.stroke();
      });
      break;
    case "rocha":
      for ( const [x, y] of spots(8, 15) ) wrapped(ctx, (dx, dy) => {
        const k = 3 + r() * 3;
        ctx.beginPath(); ctx.moveTo(x + dx - k, y + dy + k * 0.6); ctx.lineTo(x + dx - k * 0.6, y + dy - k * 0.7);
        ctx.lineTo(x + dx + k * 0.5, y + dy - k); ctx.lineTo(x + dx + k, y + dy + k * 0.6); ctx.closePath();
        ctx.fillStyle = hex; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = ink; ctx.stroke();
      });
      break;
    case "neve":
      ctx.strokeStyle = hex; ctx.fillStyle = hex; ctx.lineWidth = 1.2;
      for ( const [x, y] of spots(10, 12) ) wrapped(ctx, (dx, dy) => {
        for ( let a = 0; a < 3; a++ ) {
          const t = a * Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(x + dx - Math.cos(t) * 3.5, y + dy - Math.sin(t) * 3.5); ctx.lineTo(x + dx + Math.cos(t) * 3.5, y + dy + Math.sin(t) * 3.5); ctx.stroke();
        }
      });
      for ( const [x, y] of spots(10, 8) ) wrapped(ctx, (dx, dy) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.3, 0, Math.PI * 2); ctx.fill(); });
      break;
    case "gelo":
      ctx.strokeStyle = ink; ctx.lineWidth = 1.3;
      for ( const [x, y] of spots(5, 18) ) wrapped(ctx, (dx, dy) => {
        let px = x + dx, py = y + dy;
        ctx.beginPath(); ctx.moveTo(px, py);
        for ( let k = 0; k < 4; k++ ) { px += (r() - 0.5) * 18; py += (r() - 0.5) * 18; ctx.lineTo(px, py); }
        ctx.stroke();
      });
      break;
    case "lava":
      ctx.fillStyle = shade(hex, -0.55); ctx.fillRect(0, 0, TILE, TILE);
      ctx.strokeStyle = hex; ctx.lineWidth = 2.6;
      for ( const [x, y] of spots(6, 16) ) wrapped(ctx, (dx, dy) => {
        let px = x + dx, py = y + dy;
        ctx.beginPath(); ctx.moveTo(px, py);
        for ( let k = 0; k < 3; k++ ) { px += (r() - 0.5) * 22; py += (r() - 0.5) * 22; ctx.lineTo(px, py); }
        ctx.stroke();
      });
      ctx.strokeStyle = light; ctx.lineWidth = 0.9;
      for ( const [x, y] of spots(4, 20) ) wrapped(ctx, (dx, dy) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2); ctx.stroke(); });
      break;
    case "ondas":
      ctx.strokeStyle = hex; ctx.lineWidth = 1.8;
      for ( const [x, y] of spots(6, 18) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx - 8, y + dy); ctx.quadraticCurveTo(x + dx - 4, y + dy - 5, x + dx, y + dy);
        ctx.quadraticCurveTo(x + dx + 4, y + dy + 5, x + dx + 8, y + dy); ctx.stroke();
      });
      break;
    case "cristais":
      for ( const [x, y] of spots(6, 18) ) wrapped(ctx, (dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x + dx, y + dy - 8); ctx.lineTo(x + dx + 4, y + dy); ctx.lineTo(x + dx, y + dy + 6); ctx.lineTo(x + dx - 4, y + dy); ctx.closePath();
        ctx.fillStyle = hex; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = ink; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + dx - 1, y + dy - 4); ctx.lineTo(x + dx - 2, y + dy); ctx.strokeStyle = light; ctx.stroke();
      });
      break;
    case "hachura":
    case "cruzado":
      ctx.strokeStyle = hex; ctx.lineWidth = 1.6;
      for ( let k = -TILE; k <= TILE; k += 8 ) {
        ctx.beginPath(); ctx.moveTo(k, TILE); ctx.lineTo(k + TILE, 0); ctx.stroke();
        if ( key === "cruzado" ) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + TILE, TILE); ctx.stroke(); }
      }
      break;
    case "pontos":
      ctx.fillStyle = hex;
      for ( let y = 4; y < TILE; y += 8 ) for ( let x = (y / 8) % 2 ? 0 : 4; x < TILE; x += 8 ) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill(); }
      break;
    case "escamas":
      ctx.strokeStyle = hex; ctx.lineWidth = 1.6;
      for ( let row = 0; row < 5; row++ ) for ( let col = -1; col < 5; col++ ) {
        const x = col * 16 + (row % 2) * 8, y = row * 16;
        ctx.beginPath(); ctx.arc(x + 8, y, 8, 0, Math.PI); ctx.stroke();
      }
      break;
    default:
      ctx.fillStyle = hex; ctx.fillRect(0, 0, TILE, TILE);
  }
  tileCache.set(id, canvas);
  return canvas;
}

/* ---------------------------------------------------------------------------------------------- */
/* The layer                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export class PaintLayer {
  /**
   * @param {HTMLCanvasElement} canvas  the committed painting
   * @param {HTMLCanvasElement} live    the stroke being drawn (shown above, merged on release)
   */
  constructor(canvas, live, res = 1.5) {
    this.canvas = canvas;
    this.live = live;
    this.strokes = [];
    this.image = null;
    this.imageSrc = "";
    this.landPath = null;
    this.seaPath = null;
    this.setResolution(res);
  }

  setResolution(res) {
    this.res = [1, 1.5, 2].includes(Number(res)) ? Number(res) : 1.5;
    for ( const c of [this.canvas, this.live] ) {
      c.width = Math.round(MAP_W * this.res);
      c.height = Math.round(MAP_H * this.res);
    }
    this.redraw();
  }

  /** `landD`: SVG path data of all land (evenodd). Null for bases without land (blank sea, image). */
  setLand(landD) {
    try {
      this.landPath = landD ? new Path2D(landD) : null;
      this.seaPath = landD ? new Path2D(`M0 0H${MAP_W}V${MAP_H}H0Z${landD}`) : null;
    } catch ( err ) {
      this.landPath = this.seaPath = null;
    }
    this.redraw();
  }

  /** Replace the strokes; when the old list is a prefix of the new one only the new strokes are drawn. */
  setStrokes(strokes) {
    const list = Array.isArray(strokes) ? strokes : [];
    const old = this.strokes;
    const prefix = old.length <= list.length && old.every((s, i) => s === list[i] || JSON.stringify(s) === JSON.stringify(list[i]));
    this.strokes = list.slice();
    if ( prefix ) this.drawMany(this.canvas.getContext("2d"), list.slice(old.length));
    else this.redraw();
  }

  redraw() {
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if ( this.image ) ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    this.drawMany(ctx, this.strokes ?? []);
  }

  /** A consolidated painting (image file) drawn under the strokes. Resolves when it is on screen. */
  setImage(src) {
    const path = String(src ?? "");
    if ( path === this.imageSrc ) return Promise.resolve();
    this.imageSrc = path;
    if ( !path ) {
      this.image = null;
      this.redraw();
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        if ( this.imageSrc === path ) {
          this.image = img;
          this.redraw();
        }
        resolve();
      };
      img.onerror = () => {
        console.warn(`mapa-mundi-fu | pintura consolidada não carregou: ${path}`);
        resolve();
      };
      img.src = path;
    });
  }

  /** Clip to land or sea. Clipping by the whole coastline is costly, so it is done once per run of strokes. */
  applyClip(ctx, mode) {
    if ( mode === "l" && this.landPath ) ctx.clip(this.landPath, "evenodd");
    else if ( mode === "s" && this.seaPath ) ctx.clip(this.seaPath, "evenodd");
  }

  /** Draw many stored strokes, grouping consecutive strokes that share a clip mode. */
  drawMany(ctx, list) {
    let i = 0;
    while ( i < list.length ) {
      const mode = list[i].m;
      let j = i;
      while ( j < list.length && list[j].m === mode ) j++;
      ctx.save();
      ctx.setTransform(this.res, 0, 0, this.res, 0, 0);
      this.applyClip(ctx, mode);
      for ( let k = i; k < j; k++ ) this.strokeBody(ctx, list[k]);
      ctx.restore();
      i = j;
    }
  }

  /** Draw one stroke (stored, or the live one with `pts` already decoded), with its own clip. */
  drawStroke(ctx, stroke, pts = null) {
    ctx.save();
    ctx.setTransform(this.res, 0, 0, this.res, 0, 0);
    this.applyClip(ctx, stroke.m);
    this.strokeBody(ctx, stroke, pts);
    ctx.restore();
  }

  /**
   * The stroke itself (transform and clip already set). Soft brushes are drawn as a few concentric passes
   * of decreasing width whose opacities add up to the stroke's opacity: a soft edge without blur filters.
   */
  strokeBody(ctx, stroke, pts = null) {
    const points = pts ?? decodePoints(stroke.p, POINT_SCALE);
    if ( !points.length ) return;
    const w = Math.max(1, Number(stroke.w) || 10);
    const hex = asColor(stroke.c, "#000000");
    const opacity = Math.min(1, Math.max(0.02, Number(stroke.o ?? 1)));
    const soft = stroke.t === "b" ? Math.min(1, Math.max(0, Number(stroke.s) || 0)) : 0;
    let paint = hex;
    if ( stroke.t === "x" ) {
      const pattern = ctx.createPattern(tileFor(stroke.x || "floresta", hex), "repeat");
      if ( pattern ) paint = pattern;
    }
    const path = new Path2D();
    const single = points.length === 1;
    if ( single ) path.arc(points[0][0], points[0][1], w / 2, 0, Math.PI * 2);
    else {
      path.moveTo(points[0][0], points[0][1]);
      for ( let i = 1; i < points.length - 1; i++ ) {
        const mx = (points[i][0] + points[i + 1][0]) / 2, my = (points[i][1] + points[i + 1][1]) / 2;
        path.quadraticCurveTo(points[i][0], points[i][1], mx, my);
      }
      const last = points[points.length - 1];
      path.lineTo(last[0], last[1]);
    }
    ctx.globalCompositeOperation = stroke.t === "e" ? "destination-out" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = paint;
    ctx.fillStyle = paint;
    /* each pass stays translucent (even at 100% opacity) so the edge is always soft */
    const passes = soft > 0 ? Math.round(5 + soft * 7) : 1;
    const alpha = passes === 1 ? opacity : Math.min(0.32, 1 - Math.pow(1 - Math.min(opacity, 0.97), 1 / passes));
    for ( let k = 0; k < passes; k++ ) {
      const width = passes === 1 ? w : w * (1 + soft * 0.35) * (1 - (k / passes) * soft * 0.85);
      ctx.globalAlpha = alpha;
      if ( single ) {
        ctx.beginPath();
        ctx.arc(points[0][0], points[0][1], width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      else {
        ctx.lineWidth = width;
        ctx.stroke(path);
      }
    }
  }

  /** Show the stroke in progress on the live canvas (erasers draw straight on the painting). */
  drawLive(stroke, pts) {
    if ( stroke.t === "e" ) {
      const ctx = this.canvas.getContext("2d");
      const tail = pts.slice(-3);
      this.drawStroke(ctx, { ...stroke, s: 0 }, tail.length ? tail : pts);
      return;
    }
    const ctx = this.live.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.live.width, this.live.height);
    this.drawStroke(ctx, stroke, pts);
  }

  /** Keep a finished stroke: brushes move from the live canvas to the painting; erasers are already there. */
  commit(stroke) {
    if ( stroke.t !== "e" ) this.drawStroke(this.canvas.getContext("2d"), stroke);
    this.strokes.push(stroke);
    this.clearLive();
  }

  clearLive() {
    const ctx = this.live.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.live.width, this.live.height);
  }
}

/** A small preview of a texture brush for the tool panel (data URL). */
export function texturePreview(key, hex) {
  try {
    return tileFor(key, asColor(hex, "#4f7d45")).toDataURL();
  } catch ( err ) {
    return "";
  }
}
