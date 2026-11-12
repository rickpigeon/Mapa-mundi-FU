/**
 * Mapa-mundi-FU: pure geometry (no Foundry, no DOM). Loops are arrays of [x, y] in map units.
 */

/** "x y dx dy dx dy ..." -> [[x, y], ...] */
export function decodeLoop(text) {
  const n = String(text ?? "").trim().split(/\s+/).map(Number);
  const pts = [];
  if ( n.length < 2 || n.some(v => !Number.isFinite(v)) ) return pts;
  let x = n[0], y = n[1];
  pts.push([x, y]);
  for ( let i = 2; i + 1 < n.length; i += 2 ) {
    x += n[i];
    y += n[i + 1];
    pts.push([x, y]);
  }
  return pts;
}

/** [[x, y], ...] -> "x y dx dy ..." with `scale` decimals folded into integers (scale 2 = half units). */
export function encodePoints(pts, scale = 1) {
  const out = [];
  let px = 0, py = 0;
  pts.forEach(([x, y], i) => {
    const ix = Math.round(x * scale), iy = Math.round(y * scale);
    if ( i === 0 ) out.push(ix, iy);
    else out.push(ix - px, iy - py);
    px = ix;
    py = iy;
  });
  return out.join(" ");
}

export function decodePoints(text, scale = 1) {
  return decodeLoop(text).map(([x, y]) => [x / scale, y / scale]);
}

export function polygonArea(pts) {
  let s = 0;
  for ( let i = 0; i < pts.length; i++ ) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

export function bbox(pts) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for ( const [x, y] of pts ) {
    if ( x < minX ) minX = x;
    if ( y < minY ) minY = y;
    if ( x > maxX ) maxX = x;
    if ( y > maxY ) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function pointInPolygon(x, y, pts) {
  let inside = false;
  for ( let i = 0, j = pts.length - 1; i < pts.length; j = i++ ) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ( ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ) inside = !inside;
  }
  return inside;
}

const inBox = (b, x, y) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;

/**
 * Group loops into landmasses: a loop inside an odd number of other loops is a hole (lake) of its
 * smallest container; anything else is land. Returns [{ id, outer, holes, box, area }], largest first.
 */
export function buildLandmasses(loops, prefix = "L") {
  const items = loops.map((pts, index) => ({ index, pts, box: bbox(pts), area: Math.abs(polygonArea(pts)) }))
    .filter(l => l.pts.length >= 3);
  for ( const a of items ) {
    const [x, y] = a.pts[0];
    a.parents = items.filter(b => b !== a && b.area > a.area && inBox(b.box, x, y) && pointInPolygon(x, y, b.pts));
  }
  const lands = [];
  const byIndex = new Map();
  for ( const a of items ) {
    if ( a.parents.length % 2 === 0 ) {
      const land = { id: `${prefix}${a.index}`, outer: a.pts, holes: [], box: a.box, area: a.area };
      lands.push(land);
      byIndex.set(a.index, land);
    }
  }
  for ( const a of items ) {
    if ( a.parents.length % 2 === 0 ) continue;
    const parent = a.parents.reduce((best, b) => (!best || b.area < best.area ? b : best), null);
    const land = parent ? byIndex.get(parent.index) : null;
    if ( land ) {
      land.holes.push(a.pts);
      land.area -= a.area;
    }
  }
  return lands.sort((a, b) => b.area - a.area);
}

/** Is the point on this landmass (inside the outer loop and not in a lake)? */
export function pointInLand(land, x, y) {
  if ( !inBox(land.box, x, y) || !pointInPolygon(x, y, land.outer) ) return false;
  return !land.holes.some(h => pointInPolygon(x, y, h));
}

export function landAt(lands, x, y) {
  /* smallest first, so an island in a lake wins over the continent around the lake */
  let found = null;
  for ( const land of lands ) if ( pointInLand(land, x, y) && (!found || land.area < found.area) ) found = land;
  return found;
}

const f1 = v => Math.round(v * 10) / 10;

/**
 * Catmull-Rom spline through the points as SVG cubic Bézier segments.
 * `closed` joins the end to the start. `tension` 0 = straight lines, 1 = round.
 */
export function smoothPath(pts, closed = true, tension = 0.5) {
  const n = pts.length;
  if ( n === 0 ) return "";
  if ( n < 3 || tension <= 0 ) {
    return `M${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${closed ? "Z" : ""}`;
  }
  const k = tension / 3;
  const at = i => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for ( let i = 0; i < segs; i++ ) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? `${d}Z` : d;
}

export function landPath(land, tension = 0.5) {
  return [land.outer, ...land.holes].map(p => smoothPath(p, true, tension)).join("");
}

/** Douglas-Peucker for open polylines. */
export function simplify(pts, eps) {
  if ( pts.length < 3 ) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while ( stack.length ) {
    const [a, b] = stack.pop();
    let dmax = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for ( let i = a + 1; i < b; i++ ) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if ( d > dmax ) {
        dmax = d;
        idx = i;
      }
    }
    if ( dmax > eps ) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

export function polylineLength(pts) {
  let s = 0;
  for ( let i = 1; i < pts.length; i++ ) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

/** Points every `step` units along a polyline (for sampling regions under a ruler). */
export function samplePolyline(pts, step) {
  const out = [];
  if ( !pts.length ) return out;
  out.push(pts[0]);
  for ( let i = 1; i < pts.length; i++ ) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(len / step));
    for ( let k = 1; k <= n; k++ ) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}

/** Distance from a point to a segment. */
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToPolyline(px, py, pts, closed = false) {
  let best = Infinity;
  const n = pts.length;
  for ( let i = 1; i < n; i++ ) best = Math.min(best, distToSegment(px, py, ...pts[i - 1], ...pts[i]));
  if ( closed && n > 2 ) best = Math.min(best, distToSegment(px, py, ...pts[n - 1], ...pts[0]));
  return best;
}

/** Flat [x, y, x, y] <-> [[x, y]] for stored routes and regions. */
export const pairs = flat => {
  const out = [];
  for ( let i = 0; i + 1 < flat.length; i += 2 ) out.push([flat[i], flat[i + 1]]);
  return out;
};
export const flatten = pts => pts.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);

export function centroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for ( let i = 0; i < pts.length; i++ ) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  if ( Math.abs(a) < 1e-6 ) {
    const b = bbox(pts);
    return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  }
  return [cx / (3 * a), cy / (3 * a)];
}
