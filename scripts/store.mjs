/**
 * Mapa-mundi-FU: storage. Everything lives in world settings, which every player can read and only the
 * GM can write (Foundry's SETTINGS_MODIFY permission), so the map is "view for all, edit for the GM".
 *
 *   mapa     the map: base, style, landmass colours and the objects (stamps, names, effects, routes, regions)
 *   pintura  the painting strokes (kept apart because it grows the most)
 *   ficha    the World Sheet (page 1 of the sheets: shape, magic, history, mysteries, threats, nations)
 */
import { CELL, MAP_H, MAP_W, MODULE_ID, bool, clamp, color, num, str, uid } from "./constants.mjs";
import {
  AREA_FX, ELEMENTS, LABEL_FX, REGION_BORDERS, REGION_PATTERNS, ROUTE_STYLES, STAMPS, STAMP_FX, THEMES, THREATS, TEXTURES
} from "./catalog.mjs";
import { DEFAULT_GEN, SHAPES } from "./generator.mjs";

export const BASES = {
  folha2: "Ficha de mapa: mapa 2 (última página)",
  folha1: "Ficha de mapa: mapa 1",
  gerado: "Continentes gerados",
  vazio: "Só o mar (desenhe tudo)",
  imagem: "Imagem própria"
};

export const DECOR_DEFAULTS = {
  grid: true, rhumb: true, compass: true, scale: true, header: true, frame: true,
  rings: true, waves: false, clouds: false, vignette: false
};

export function setting(key, fallback = null) {
  try {
    return game.settings.get(MODULE_ID, key);
  } catch ( err ) {
    return fallback;
  }
}

const clone = value => (globalThis.foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : structuredClone(value));

/* ---------------------------------------------------------------------------------------------- */
/* Normalization: anything stored (or typed in a macro) is coerced into a safe shape.              */
/* ---------------------------------------------------------------------------------------------- */

const pick = (value, table, fallback) => (Object.prototype.hasOwnProperty.call(table, value) ? value : fallback);
const coord = (v, fallback, max) => Math.round(num(v, fallback, -200, max + 200) * 10) / 10;

function normalizePoints(value, closed) {
  const flat = Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
  const usable = flat.length - (flat.length % 2);
  const out = flat.slice(0, Math.min(usable, 4000)).map((v, i) => clamp(Math.round(v * 10) / 10, -200, (i % 2 ? MAP_H : MAP_W) + 200));
  return out.length >= (closed ? 6 : 4) ? out : null;
}

function common(o) {
  return {
    id: typeof o.id === "string" && /^[\w-]{1,40}$/.test(o.id) ? o.id : uid(),
    name: str(o.name, "", 120),
    note: str(o.note, "", 4000),
    gmNote: str(o.gmNote, "", 4000),
    link: str(o.link, "", 300),
    hidden: bool(o.hidden, false)
  };
}

export function normalizeObject(o) {
  if ( !o || typeof o !== "object" ) return null;
  const base = common(o);
  switch ( o.type ) {
    case "stamp": {
      const key = pick(o.key, STAMPS, null);
      if ( !key ) return null;
      return {
        ...base, type: "stamp", key,
        x: coord(o.x, MAP_W / 2, MAP_W), y: coord(o.y, MAP_H / 2, MAP_H),
        size: num(o.size, STAMPS[key].size, 12, 600), rot: num(o.rot, 0, -360, 360), flip: bool(o.flip, false),
        color: color(o.color, null), color2: color(o.color2, null),
        fx: pick(o.fx, STAMP_FX, "none"), aura: o.aura ? pick(o.aura, ELEMENTS, null) : null,
        showName: bool(o.showName, false), opacity: num(o.opacity, 1, 0.1, 1)
      };
    }
    case "label": {
      const text = str(o.text, "", 200);
      return {
        ...base, type: "label", text: text || base.name || "Nome",
        x: coord(o.x, MAP_W / 2, MAP_W), y: coord(o.y, MAP_H / 2, MAP_H),
        size: num(o.size, 40, 8, 400), font: str(o.font, "Signika", 80) || "Signika",
        color: color(o.color, "#2b2b2b"), outline: color(o.outline, "#ffffff"), outlineW: num(o.outlineW, 3, 0, 12),
        bold: bool(o.bold, true), italic: bool(o.italic, false), caps: bool(o.caps, true),
        spacing: num(o.spacing, 0.12, -0.1, 1.5), curve: num(o.curve, 0, -100, 100), rot: num(o.rot, 0, -360, 360),
        fx: pick(o.fx, LABEL_FX, "none"), fxColor: color(o.fxColor, "#ffd34d"), opacity: num(o.opacity, 1, 0.1, 1)
      };
    }
    case "fx": {
      const kind = pick(o.kind, AREA_FX, "mana");
      return {
        ...base, type: "fx", kind, element: pick(o.element, ELEMENTS, "fire"),
        x: coord(o.x, MAP_W / 2, MAP_W), y: coord(o.y, MAP_H / 2, MAP_H),
        r: num(o.r, AREA_FX[kind].r, 15, 900), color: color(o.color, null), intensity: num(o.intensity, 2, 1, 3),
        showIcon: bool(o.showIcon, kind === "mana")
      };
    }
    case "route": {
      const pts = normalizePoints(o.pts, false);
      if ( !pts ) return null;
      const style = pick(o.style, ROUTE_STYLES, "estrada");
      return {
        ...base, type: "route", style, pts,
        color: color(o.color, ROUTE_STYLES[style].color), width: num(o.width, ROUTE_STYLES[style].width, 1, 60),
        smooth: bool(o.smooth, true), arrow: bool(o.arrow, style === "viagem"), animated: bool(o.animated, ["maritima", "aerea", "ley", "viagem"].includes(style)),
        showName: bool(o.showName, false)
      };
    }
    case "region": {
      const pts = normalizePoints(o.pts, true);
      if ( !pts ) return null;
      return {
        ...base, type: "region", pts,
        color: color(o.color, "#9b1d20"), opacity: num(o.opacity, 0.25, 0, 1),
        pattern: pick(o.pattern, REGION_PATTERNS, "hachura"), border: pick(o.border, REGION_BORDERS, "tracejada"),
        borderW: num(o.borderW, 4, 0, 30), smooth: bool(o.smooth, true),
        threat: o.threat ? pick(o.threat, THREATS, null) : null, showName: bool(o.showName, true)
      };
    }
    default:
      return null;
  }
}

export function normalizeMap(value) {
  const v = value && typeof value === "object" ? value : {};
  const base = v.base && typeof v.base === "object" ? v.base : {};
  const style = v.style && typeof v.style === "object" ? v.style : {};
  const info = v.info && typeof v.info === "object" ? v.info : {};
  const gen = base.gen && typeof base.gen === "object" ? base.gen : {};
  const decor = { ...DECOR_DEFAULTS };
  for ( const k of Object.keys(DECOR_DEFAULTS) ) if ( typeof style.decor?.[k] === "boolean" ) decor[k] = style.decor[k];
  const lands = {};
  if ( v.lands && typeof v.lands === "object" ) {
    for ( const [k, c] of Object.entries(v.lands) ) if ( /^[\w-]{1,40}$/.test(k) && color(c) ) lands[k] = color(c);
  }
  const objects = (Array.isArray(v.objects) ? v.objects : []).map(normalizeObject).filter(Boolean);
  const seen = new Set();
  for ( const o of objects ) {
    if ( seen.has(o.id) ) o.id = uid();
    seen.add(o.id);
  }
  return {
    v: 1,
    rev: num(v.rev, 0, 0),
    base: {
      kind: pick(base.kind, BASES, "folha2"),
      seed: Math.floor(num(base.seed, 20261111, 1, 2 ** 31)),
      gen: {
        shape: pick(gen.shape, SHAPES, DEFAULT_GEN.shape),
        land: num(gen.land, DEFAULT_GEN.land, 0.08, 0.7),
        rough: num(gen.rough, DEFAULT_GEN.rough, 0, 1),
        islands: num(gen.islands, DEFAULT_GEN.islands, 0, 1)
      },
      image: str(base.image, "", 500),
      imageFit: pick(base.imageFit, { cover: 1, contain: 1, stretch: 1 }, "cover")
    },
    info: { world: str(info.world, "", 80), number: str(info.number, "1", 12), region: str(info.region, "", 80) },
    style: {
      theme: pick(style.theme, THEMES, "folha"),
      sea: color(style.sea, null), land: color(style.land, null), coast: color(style.coast, null),
      decor,
      dayCells: num(style.dayCells, 1, 0.25, 20),
      landTension: num(style.landTension, 0.5, 0, 1)
    },
    lands,
    objects
  };
}

export function normalizePaint(value) {
  const v = value && typeof value === "object" ? value : {};
  const strokes = (Array.isArray(v.strokes) ? v.strokes : []).filter(s => s && typeof s === "object" && typeof s.p === "string").map(s => ({
    t: ["b", "x", "e"].includes(s.t) ? s.t : "b",
    c: color(s.c, "#000000"),
    w: num(s.w, 20, 1, 800),
    o: num(s.o, 1, 0.02, 1),
    s: num(s.s, 0, 0, 1),
    m: ["a", "l", "s"].includes(s.m) ? s.m : "a",
    x: Object.prototype.hasOwnProperty.call(TEXTURES, s.x) ? s.x : undefined,
    p: s.p.slice(0, 200000)
  }));
  return { rev: num(v.rev, 0, 0), image: str(v.image, "", 500), strokes };
}

/** Rough size of the stored painting in bytes (what goes through the socket on every save). */
export const paintSize = paint => JSON.stringify(paint ?? {}).length;

export const SHEET_FIELDS = {
  shape: "Nome e formato do mundo",
  magic: "Magia e tecnologia",
  history: "Eventos históricos",
  mysteries: "Enigmas e mistérios",
  threats: "Ameaças"
};

export function normalizeSheet(value) {
  const v = value && typeof value === "object" ? value : {};
  const fields = {};
  const hidden = {};
  for ( const k of Object.keys(SHEET_FIELDS) ) {
    fields[k] = str(v.fields?.[k], "", 20000);
    hidden[k] = bool(v.hidden?.[k], false);
  }
  const nations = (Array.isArray(v.nations) ? v.nations : []).slice(0, 60).map(n => ({
    id: typeof n?.id === "string" && /^[\w-]{1,40}$/.test(n.id) ? n.id : uid("n"),
    name: str(n?.name, "", 120),
    kind: str(n?.kind, "", 60),
    text: str(n?.text, "", 8000),
    color: color(n?.color, "#9b1d20"),
    hidden: bool(n?.hidden, false)
  }));
  return { name: str(v.name, "", 120), fields, hidden, nations };
}

/* ---------------------------------------------------------------------------------------------- */
/* Settings                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

export function registerSettings() {
  const world = (key, def) => game.settings.register(MODULE_ID, key, { scope: "world", config: false, type: Object, default: def });
  world("mapa", {});
  world("pintura", { rev: 0, image: "", strokes: [] });
  world("ficha", {});
  game.settings.register(MODULE_ID, "pingJogadores", {
    name: "Jogadores podem marcar o mapa",
    hint: "Com duplo clique no mapa, o jogador faz um sinal que aparece para todos (não altera o mapa).",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, "animacoes", {
    name: "Animações do Mapa-múndi",
    hint: "Só neste computador. Reduzidas mantém brilhos parados e tira as partículas; desligadas tira tudo.",
    scope: "client", config: true, type: String, default: "full",
    choices: { full: "Completas", reduced: "Reduzidas", off: "Desligadas" },
    onChange: () => Hooks.callAll(`${MODULE_ID}.prefs`)
  });
  game.settings.register(MODULE_ID, "qualidade", {
    name: "Nitidez da pintura do Mapa-múndi",
    hint: "Só neste computador. Mais nítida usa mais memória de vídeo.",
    scope: "client", config: true, type: String, default: "1.5",
    choices: { 1: "Normal", 1.5: "Alta", 2: "Máxima" },
    onChange: () => Hooks.callAll(`${MODULE_ID}.prefs`)
  });
}

export const getMap = () => normalizeMap(clone(setting("mapa", {}) ?? {}));
export const getPaint = () => normalizePaint(clone(setting("pintura", {}) ?? {}));
export const getSheet = () => normalizeSheet(clone(setting("ficha", {}) ?? {}));

/* Writes are throttled: many small edits (dragging, sliders) become one save. */
const pending = new Map();
function throttled(key, value, wait) {
  const entry = pending.get(key) ?? { timer: null, value: null, resolvers: [] };
  entry.value = value;
  pending.set(key, entry);
  return new Promise(resolve => {
    entry.resolvers.push(resolve);
    if ( entry.timer ) return;
    entry.timer = setTimeout(() => flushKey(key), wait);
  });
}

async function flushKey(key) {
  const entry = pending.get(key);
  if ( !entry ) return;
  pending.delete(key);
  clearTimeout(entry.timer);
  try {
    if ( game.user.isGM ) await game.settings.set(MODULE_ID, key, entry.value);
  } finally {
    entry.resolvers.forEach(r => r());
  }
}

export async function flushAll() {
  await Promise.all([...pending.keys()].map(flushKey));
}

export const hasPending = () => pending.size > 0;

export function saveMap(map, wait = 450) {
  return throttled("mapa", map, wait);
}
export function savePaint(paint, wait = 700) {
  return throttled("pintura", paint, wait);
}
export function saveSheet(sheet, wait = 500) {
  return throttled("ficha", sheet, wait);
}

/** Travel cells to map units. */
export const dayLength = map => CELL * (map?.style?.dayCells ?? 1);
