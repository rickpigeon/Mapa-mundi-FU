/**
 * Mapa-mundi-FU: seeded continent generator (pure, no Foundry). Produces closed coastline loops in the
 * 2400 x 1600 map space, the same shape as the World Sheet coastlines, so everything else is shared.
 */
import { MAP_H, MAP_W, rng } from "./constants.mjs";
import { polygonArea, simplify } from "./geometry.mjs";

export const SHAPES = {
  continentes: "Continentes",
  pangeia: "Supercontinente",
  dois: "Dois continentes",
  anel: "Anel ao redor de um mar",
  arquipelago: "Arquipélago",
  flutuantes: "Ilhas flutuantes"
};

export const DEFAULT_GEN = { shape: "continentes", land: 0.38, rough: 0.5, islands: 0.4 };

/** Share of land that suits each shape (used when the GM picks a shape). */
export const SHAPE_LAND = { continentes: 0.38, pangeia: 0.42, dois: 0.4, anel: 0.36, arquipelago: 0.2, flutuantes: 0.18 };

const GW = 161, GH = 108;

function valueNoise(rand, size = 64) {
  const grid = new Float32Array(size * size);
  for ( let i = 0; i < grid.length; i++ ) grid[i] = rand();
  const at = (x, y) => grid[((y % size + size) % size) * size + ((x % size + size) % size)];
  const fade = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const tx = fade(x - x0), ty = fade(y - y0);
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
  };
}

function fbm(noise, x, y, octaves, persistence) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for ( let o = 0; o < octaves; o++ ) {
    sum += noise(x * freq + o * 17.3, y * freq - o * 9.1) * amp;
    norm += amp;
    amp *= persistence;
    freq *= 2;
  }
  return sum / norm;
}

/** Blobs (centre, radii, angle) that give each shape its layout. */
function blobsFor(shape, rand) {
  const W = MAP_W, H = MAP_H;
  const blob = (x, y, rx, ry, a = rand() * Math.PI) => ({ x, y, rx, ry, a });
  const r = (min, max) => min + rand() * (max - min);
  switch ( shape ) {
    case "pangeia":
      return [blob(W / 2 + r(-120, 120), H / 2 + r(-80, 80), r(780, 900), r(520, 600), r(-0.3, 0.3)),
        blob(W / 2 + r(-500, 500), H / 2 + r(-250, 250), r(300, 450), r(250, 350))];
    case "dois":
      return [blob(W * 0.28 + r(-80, 80), H * 0.5 + r(-120, 120), r(380, 480), r(520, 640), r(-0.4, 0.4)),
        blob(W * 0.72 + r(-80, 80), H * 0.5 + r(-120, 120), r(380, 480), r(520, 640), r(-0.4, 0.4))];
    case "anel": {
      const n = 5 + Math.floor(rand() * 3);
      const out = [];
      for ( let i = 0; i < n; i++ ) {
        const t = (i / n) * Math.PI * 2 + r(-0.2, 0.2);
        out.push(blob(W / 2 + Math.cos(t) * W * 0.33, H / 2 + Math.sin(t) * H * 0.32, r(260, 360), r(160, 230), t + Math.PI / 2));
      }
      return out;
    }
    case "arquipelago": {
      const n = 22 + Math.floor(rand() * 14);
      return Array.from({ length: n }, () => blob(r(180, W - 180), r(160, H - 160), r(70, 200), r(60, 160)));
    }
    case "flutuantes": {
      const out = [];
      const cols = 5, rows = 3;
      for ( let j = 0; j < rows; j++ ) for ( let i = 0; i < cols; i++ ) {
        if ( rand() < 0.18 ) continue;
        out.push(blob((i + 0.5) * W / cols + r(-110, 110), (j + 0.5) * H / rows + r(-90, 90), r(110, 190), r(80, 140)));
      }
      return out;
    }
    default: {
      const n = 3 + Math.floor(rand() * 3);
      const out = [];
      for ( let i = 0; i < n; i++ ) out.push(blob(r(380, W - 380), r(320, H - 320), r(300, 560), r(220, 420)));
      return out;
    }
  }
}

/**
 * Generate coastline loops. `opts`: { seed, shape, land (0.1-0.7 of the map), rough (0-1), islands (0-1) }.
 * Returns [[[x, y], ...], ...] (outer loops and lake loops; geometry.buildLandmasses sorts them out).
 */
export function generateLoops(opts = {}) {
  const seed = Number(opts.seed) || 1;
  const shape = SHAPES[opts.shape] ? opts.shape : DEFAULT_GEN.shape;
  const land = Math.min(0.7, Math.max(0.08, Number(opts.land ?? SHAPE_LAND[shape] ?? DEFAULT_GEN.land)));
  const rough = Math.min(1, Math.max(0, Number(opts.rough ?? DEFAULT_GEN.rough)));
  const islands = Math.min(1, Math.max(0, Number(opts.islands ?? DEFAULT_GEN.islands)));
  const rand = rng(seed);
  const noise = valueNoise(rand);
  const noise2 = valueNoise(rand);
  const blobs = blobsFor(shape, rand);
  const sx = MAP_W / (GW - 1), sy = MAP_H / (GH - 1);
  const floating = shape === "flutuantes";
  const field = new Float32Array(GW * GH);
  const persistence = 0.38 + rough * 0.27;
  const scattered = shape === "arquipelago" || floating;
  const amp = (0.35 + rough * 0.55) * (scattered ? 0.55 : 1);
  for ( let j = 0; j < GH; j++ ) for ( let i = 0; i < GW; i++ ) {
    const x = i * sx, y = j * sy;
    let s = 0;
    for ( const b of blobs ) {
      const dx = x - b.x, dy = y - b.y;
      const c = Math.cos(b.a), sn = Math.sin(b.a);
      const u = (dx * c + dy * sn) / b.rx, v = (-dx * sn + dy * c) / b.ry;
      const d2 = u * u + v * v;
      const f = d2 >= 1 ? 0 : (1 - d2) * (1 - d2);
      s = floating ? Math.max(s, f) : s + f;
    }
    s = Math.min(1.2, s);
    const n = fbm(noise, x / 260, y / 260, 5, persistence) - 0.5;
    const spikes = Math.max(0, fbm(noise2, x / 110, y / 110, 3, 0.5) - 0.62) * 3 * islands;
    let value = s + n * amp + spikes;
    /* the edge of the sheet is always sea */
    const ex = Math.min(x, MAP_W - x) / 140, ey = Math.min(y, MAP_H - y) / 140;
    const edge = Math.min(1, ex, ey);
    value *= edge < 1 ? edge * edge * (3 - 2 * edge) : 1;
    field[j * GW + i] = value;
  }

  /* threshold that gives the requested share of land */
  const sorted = Array.from(field).sort((a, b) => b - a);
  const threshold = sorted[Math.floor(land * (sorted.length - 1))];

  /* marching squares on a padded grid (the outside is sea) so every loop closes */
  const PW = GW + 2, PH = GH + 2;
  const val = (i, j) => (i <= 0 || j <= 0 || i >= PW - 1 || j >= PH - 1 ? -1 : field[(j - 1) * GW + (i - 1)] - threshold);
  const points = new Map();
  const edgeKey = (i0, j0, i1, j1) => {
    const key = i0 === i1 ? `v${i0},${Math.min(j0, j1)}` : `h${Math.min(i0, i1)},${j0}`;
    if ( !points.has(key) ) {
      const a = val(i0, j0), b = val(i1, j1);
      const t = a === b ? 0.5 : a / (a - b);
      points.set(key, [(i0 + (i1 - i0) * t - 1) * sx, (j0 + (j1 - j0) * t - 1) * sy]);
    }
    return key;
  };
  const next = new Map();
  for ( let j = 0; j < PH - 1; j++ ) for ( let i = 0; i < PW - 1; i++ ) {
    const tl = val(i, j) > 0, tr = val(i + 1, j) > 0, br = val(i + 1, j + 1) > 0, bl = val(i, j + 1) > 0;
    const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if ( code === 0 || code === 15 ) continue;
    const T = () => edgeKey(i, j, i + 1, j), R = () => edgeKey(i + 1, j, i + 1, j + 1);
    const B = () => edgeKey(i, j + 1, i + 1, j + 1), L = () => edgeKey(i, j, i, j + 1);
    const segs = {
      1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[R, T]], 5: [[L, T], [R, B]], 6: [[B, T]], 7: [[L, T]],
      8: [[T, L]], 9: [[T, B]], 10: [[T, R], [B, L]], 11: [[T, R]], 12: [[R, L]], 13: [[R, B]], 14: [[B, L]]
    }[code];
    for ( const [a, b] of segs ) next.set(a(), b());
  }
  const loops = [];
  const used = new Set();
  for ( const start of next.keys() ) {
    if ( used.has(start) ) continue;
    const loop = [];
    let k = start;
    while ( k && !used.has(k) ) {
      used.add(k);
      loop.push(points.get(k));
      k = next.get(k);
    }
    if ( loop.length < 4 ) continue;
    const area = Math.abs(polygonArea(loop));
    if ( area < sx * sy * 2.5 ) continue;
    /* simplify the closed loop as two open halves */
    const half = Math.floor(loop.length / 2);
    const a = simplify(loop.slice(0, half + 1), sx * 0.28);
    const b = simplify(loop.slice(half).concat([loop[0]]), sx * 0.28);
    const pts = a.slice(0, -1).concat(b.slice(0, -1)).map(([x, y]) => [Math.round(x), Math.round(y)]);
    if ( pts.length >= 3 ) loops.push(pts);
  }
  return loops;
}
