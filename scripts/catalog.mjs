/**
 * Mapa-mundi-FU: everything the GM can pick (themes, colours, textures, stamps, effects, routes...).
 * Pure data. Stamp drawings live in stamps-svg.mjs under the same keys.
 */
import { WONDERDRAFT, WONDERDRAFT_DIR, WONDERDRAFT_GROUPS } from "./data/wonderdraft.mjs";

export { WONDERDRAFT_GROUPS };


/* ------------------------------------------------------------------------------------------------
   Map themes. rings = coast ripples drawn in the sea; inner = shading just inside the coast;
   cliff = offset shadow under the land (floating islands); glow = coastline glow.
   ------------------------------------------------------------------------------------------------ */
export const THEMES = {
  folha: {
    label: "Ficha original", sea: "#ffffff", sea2: "#ffffff", land: "#f7f5f6", coast: "#9b9899", coastW: 2.4,
    grid: "#e3e3e3", gridA: 1, rhumb: "#d6d6d6", rings: [], inner: null, cliff: null, glow: false,
    texture: "none", ink: "#2c3a35", accent: "#2f5d4e", frame: "#9dbcae", paper: "#ffffff"
  },
  pergaminho: {
    label: "Pergaminho", sea: "#d6c49c", sea2: "#c9b385", land: "#efe1bb", coast: "#5b4630", coastW: 2.6,
    grid: "#a48f66", gridA: 0.35, rhumb: "#9a845b", rings: [[16, "#c2aa7a", 0.7], [34, "#c8b185", 0.4]],
    inner: "#d8c38f", cliff: null, glow: false, texture: "parchment", ink: "#3b2a1a", accent: "#6b4a2b", frame: "#7a5e3b", paper: "#e9dab3"
  },
  antigo: {
    label: "Carta antiga (gravura)", sea: "#ebdfc3", sea2: "#e2d3b1", land: "#f6eedb", coast: "#5e4428", coastW: 2.2,
    grid: "#8a6f4b", gridA: 0.25, rhumb: "#8a6f4b", rings: [[7, "#5e4428", 0.28], [18, "#5e4428", 0.16], [32, "#5e4428", 0.09], [50, "#5e4428", 0.05]],
    inner: null, cliff: null, glow: false, texture: "parchment", ink: "#3a2814", accent: "#5e4428", frame: "#5e4428", paper: "#efe4c9"
  },
  aquarela: {
    label: "Aquarela", sea: "#a9d5e8", sea2: "#8cc2da", land: "#f2ebd3", coast: "#4b6a78", coastW: 2.2,
    grid: "#7fa9bb", gridA: 0.3, rhumb: "#7fa9bb", rings: [[12, "#d3ecf6", 0.85], [30, "#c1e2f0", 0.5]],
    inner: "#ddd0a9", cliff: null, glow: false, texture: "paper", ink: "#2f3f47", accent: "#33586a", frame: "#5d8394", paper: "#f4f1e8"
  },
  jrpg: {
    label: "Mundo vibrante", sea: "#2f6fc4", sea2: "#22549e", land: "#86c96b", coast: "#28461f", coastW: 2.6,
    grid: "#ffffff", gridA: 0.12, rhumb: "#9cc5ff", rings: [[9, "#ffffff", 0.6], [22, "#a8d6ff", 0.35]],
    inner: "#6aac53", cliff: null, glow: false, texture: "none", ink: "#ffffff", accent: "#ffd166", frame: "#183a6b", paper: "#2f6fc4"
  },
  noite: {
    label: "Noite arcana", sea: "#0e1a2b", sea2: "#08111d", land: "#1d3346", coast: "#7fd8ff", coastW: 2,
    grid: "#2a4f72", gridA: 0.55, rhumb: "#2f5a80", rings: [[10, "#1c3c5a", 0.9], [26, "#16314b", 0.6]],
    inner: "#28445c", cliff: null, glow: true, texture: "stars", ink: "#f3dfa2", accent: "#f3dfa2", frame: "#3f6f97", paper: "#0e1a2b"
  },
  ceu: {
    label: "Ilhas no céu", sea: "#8fcdf2", sea2: "#e2f4ff", land: "#9fd37f", coast: "#4e6b3a", coastW: 2.4,
    grid: "#ffffff", gridA: 0.25, rhumb: "#ffffff", rings: [], inner: "#86bd66", cliff: "#7a5a3e", glow: false,
    texture: "none", ink: "#24425a", accent: "#24425a", frame: "#5f9bc4", paper: "#cfeaff"
  },
  gelo: {
    label: "Era do gelo", sea: "#cfe6f0", sea2: "#b7d7e6", land: "#fbfdff", coast: "#5f86a0", coastW: 2.2,
    grid: "#8fb3c6", gridA: 0.3, rhumb: "#8fb3c6", rings: [[12, "#e8f4fa", 0.85], [26, "#ddeef6", 0.5]],
    inner: "#e1edf5", cliff: null, glow: false, texture: "paper", ink: "#24465c", accent: "#2f6d8f", frame: "#6f98b1", paper: "#eef6fa"
  },
  sombrio: {
    label: "Terras sombrias", sea: "#231313", sea2: "#170b0b", land: "#3d2a24", coast: "#ff7a45", coastW: 2,
    grid: "#5a2f25", gridA: 0.5, rhumb: "#6b3628", rings: [[10, "#3a1c13", 0.9], [24, "#2e150e", 0.6]],
    inner: "#4a3129", cliff: null, glow: true, texture: "none", ink: "#ffd2a8", accent: "#ff9a5c", frame: "#7a3a28", paper: "#231313"
  },
  tecno: {
    label: "Holograma", sea: "#06121a", sea2: "#030a10", land: "#0c2a33", coast: "#29f3d1", coastW: 1.8,
    grid: "#11505a", gridA: 0.8, rhumb: "#0f6b6b", rings: [[8, "#0b3b45", 0.9], [20, "#082c34", 0.6]],
    inner: "#0f3640", cliff: null, glow: true, texture: "scan", ink: "#9ff7e6", accent: "#29f3d1", frame: "#1a8c86", paper: "#06121a"
  },
  verdejante: {
    label: "Verão", sea: "#5fb7c9", sea2: "#3f9ab0", land: "#b8d98a", coast: "#3d5a2a", coastW: 2.4,
    grid: "#ffffff", gridA: 0.18, rhumb: "#d8f3f7", rings: [[10, "#f4e7b5", 0.85], [24, "#9fdbe6", 0.5]],
    inner: "#a0c874", cliff: null, glow: false, texture: "paper", ink: "#24361a", accent: "#3d5a2a", frame: "#3f7f8f", paper: "#e9f3df"
  }
};

/* Terrain colours for the bucket and the brush. */
export const PALETTE = [
  ["Planície", "#a8c97f"], ["Campos", "#c7dc8f"], ["Floresta", "#4f7d45"], ["Selva", "#2f6b3a"],
  ["Savana", "#c9b26b"], ["Deserto", "#e3c58a"], ["Areia", "#f1dfb0"], ["Estepe", "#b9b48a"],
  ["Colinas", "#9cae6b"], ["Montanha", "#8c7b6b"], ["Rocha", "#6f6a63"], ["Neve", "#f4f7fb"],
  ["Tundra", "#b9c4b0"], ["Gelo", "#d6eef7"], ["Pântano", "#6b7a4a"], ["Brejo", "#7f8f5a"],
  ["Vulcão", "#6a2c22"], ["Lava", "#e2552b"], ["Cinzas", "#5a5555"], ["Cristal", "#8fd4e8"],
  ["Mágico", "#c79bf2"], ["Fadas", "#f2a6d4"], ["Corrompido", "#5b3a6e"], ["Miasma", "#7a8f3a"],
  ["Água rasa", "#8ecae6"], ["Mar", "#3d7fc1"], ["Mar profundo", "#1d4e89"], ["Abismo", "#0d2140"],
  ["Ouro", "#e6b84a"], ["Ferrugem", "#a5552d"], ["Sangue", "#9b1d20"], ["Noite", "#1d2333"],
  ["Branco", "#ffffff"], ["Pergaminho", "#efe1bb"], ["Cinza", "#9a9a9a"], ["Tinta", "#2b2b2b"]
];

/* Textured brushes (tiles are drawn in paint.mjs). */
export const TEXTURES = {
  floresta: "Floresta (copas)",
  pinheiros: "Pinheiros",
  grama: "Grama",
  colinas: "Colinas",
  dunas: "Dunas",
  pantano: "Pântano",
  rocha: "Pedras",
  neve: "Neve",
  gelo: "Gelo rachado",
  lava: "Lava",
  ondas: "Ondas",
  cristais: "Cristais",
  hachura: "Hachura",
  cruzado: "Hachura cruzada",
  pontos: "Pontilhado",
  escamas: "Escamas"
};

/* ------------------------------------------------------------------------------------------------
   Stamps. c1 = main colour (the GM can tint it), c2 = second colour, c3 = accent.
   ------------------------------------------------------------------------------------------------ */
export const STAMP_CATEGORIES = {
  relevo: "Relevo",
  vegetacao: "Vegetação",
  agua: "Águas",
  lugares: "Lugares",
  misterios: "Mistérios",
  monstros: "Monstros",
  veiculos: "Veículos",
  marcadores: "Marcadores",
  wonderdraft: "Wonderdraft"
};

export const STAMPS = {
  /* relevo */
  montanha: { label: "Montanha", cat: "relevo", c1: "#8c7b6b", c2: "#f4f7fb", size: 90 },
  cordilheira: { label: "Cordilheira", cat: "relevo", c1: "#8c7b6b", c2: "#f4f7fb", size: 130 },
  pico: { label: "Pico nevado", cat: "relevo", c1: "#7d8fa3", c2: "#ffffff", size: 100 },
  colinas: { label: "Colinas", cat: "relevo", c1: "#9cae6b", c2: "#7f9152", size: 90 },
  vulcao: { label: "Vulcão", cat: "relevo", c1: "#6b4a3a", c2: "#ff6a2b", size: 100 },
  mesa: { label: "Planalto", cat: "relevo", c1: "#c08a5a", c2: "#9a6a40", size: 100 },
  rochedo: { label: "Rochedo", cat: "relevo", c1: "#8a8580", c2: "#6a655f", size: 70 },
  cratera: { label: "Cratera", cat: "relevo", c1: "#8a7a6a", c2: "#5a4c40", size: 90 },
  cristal: { label: "Cristais", cat: "relevo", c1: "#8fd4e8", c2: "#c79bf2", size: 80 },
  dunas: { label: "Dunas", cat: "relevo", c1: "#e3c58a", c2: "#c9a565", size: 100 },
  /* vegetação */
  arvore: { label: "Árvore", cat: "vegetacao", c1: "#5d9a4c", c2: "#7a5a3a", size: 60 },
  pinheiro: { label: "Pinheiro", cat: "vegetacao", c1: "#3f7048", c2: "#7a5a3a", size: 60 },
  floresta: { label: "Floresta", cat: "vegetacao", c1: "#4f8a45", c2: "#3a6b38", size: 100 },
  bosque: { label: "Bosque de pinheiros", cat: "vegetacao", c1: "#3f7048", c2: "#2f5a3a", size: 100 },
  palmeira: { label: "Palmeira", cat: "vegetacao", c1: "#5fae4c", c2: "#9a7046", size: 70 },
  anciao: { label: "Árvore anciã", cat: "vegetacao", c1: "#4f9a6a", c2: "#f7e08a", size: 120 },
  cogumelos: { label: "Cogumelos gigantes", cat: "vegetacao", c1: "#d9534f", c2: "#f4ead5", size: 80 },
  cactos: { label: "Cactos", cat: "vegetacao", c1: "#6aa35a", c2: "#f2a6d4", size: 70 },
  arvoreMorta: { label: "Árvore morta", cat: "vegetacao", c1: "#6b5a4a", c2: "#4a3d32", size: 70 },
  flores: { label: "Campo de flores", cat: "vegetacao", c1: "#f2a6d4", c2: "#ffe066", size: 70 },
  /* águas */
  lago: { label: "Lago", cat: "agua", c1: "#6fb3dd", c2: "#d2ecf8", size: 90 },
  redemoinho: { label: "Redemoinho", cat: "agua", c1: "#3d7fc1", c2: "#cfe9f7", size: 90 },
  iceberg: { label: "Iceberg", cat: "agua", c1: "#e8f6fc", c2: "#9ccfe6", size: 80 },
  recife: { label: "Recife", cat: "agua", c1: "#f08a7a", c2: "#ffd0a8", size: 80 },
  cachoeira: { label: "Cachoeira", cat: "agua", c1: "#8a7b6b", c2: "#9fd7f2", size: 90 },
  ondas: { label: "Ondas", cat: "agua", c1: "#3d7fc1", c2: "#ffffff", size: 80 },
  /* lugares */
  vila: { label: "Vila", cat: "lugares", c1: "#c0553a", c2: "#f2e3c2", size: 70 },
  cidade: { label: "Cidade", cat: "lugares", c1: "#c0553a", c2: "#e9dcc0", size: 100 },
  capital: { label: "Capital", cat: "lugares", c1: "#3f6fb0", c2: "#e9e2d0", size: 120 },
  castelo: { label: "Castelo", cat: "lugares", c1: "#9a9aa6", c2: "#b23a3a", size: 100 },
  torre: { label: "Torre", cat: "lugares", c1: "#a59c90", c2: "#6a4c9c", size: 90 },
  fortaleza: { label: "Fortaleza", cat: "lugares", c1: "#7f7a74", c2: "#b23a3a", size: 100 },
  porto: { label: "Porto", cat: "lugares", c1: "#9a6a40", c2: "#e9e2d0", size: 90 },
  templo: { label: "Templo", cat: "lugares", c1: "#efe6d2", c2: "#d9a441", size: 90 },
  santuario: { label: "Santuário", cat: "lugares", c1: "#c43c3c", c2: "#3a3a3a", size: 80 },
  ruinas: { label: "Ruínas", cat: "lugares", c1: "#a59c90", c2: "#6d8a52", size: 90 },
  acampamento: { label: "Acampamento", cat: "lugares", c1: "#d8a25a", c2: "#ff8a3a", size: 80 },
  farol: { label: "Farol", cat: "lugares", c1: "#e9e2d0", c2: "#c43c3c", size: 90 },
  mina: { label: "Mina", cat: "lugares", c1: "#8a7b6b", c2: "#e6b84a", size: 80 },
  moinho: { label: "Moinho", cat: "lugares", c1: "#e9dcc0", c2: "#9a6a40", size: 90 },
  ponte: { label: "Ponte", cat: "lugares", c1: "#9a6a40", c2: "#6b4a2b", size: 90 },
  fabrica: { label: "Fábrica", cat: "lugares", c1: "#7a6f68", c2: "#b5651d", size: 100 },
  caverna: { label: "Caverna / masmorra", cat: "lugares", c1: "#8a7b6b", c2: "#1b1714", size: 80 },
  /* mistérios */
  portal: { label: "Portal", cat: "misterios", c1: "#8a7bd8", c2: "#a59c90", size: 90 },
  obelisco: { label: "Obelisco", cat: "misterios", c1: "#5a5f6a", c2: "#7fd8ff", size: 90 },
  ilhaFlutuante: { label: "Ilha flutuante", cat: "misterios", c1: "#86c96b", c2: "#8a6a4a", size: 110 },
  estatua: { label: "Estátua colossal", cat: "misterios", c1: "#b8b0a4", c2: "#8a8278", size: 100 },
  cristalSagrado: { label: "Cristal sagrado", cat: "misterios", c1: "#7fe0ff", c2: "#ffffff", size: 100 },
  arvoreMundo: { label: "Árvore do mundo", cat: "misterios", c1: "#3f8f6a", c2: "#f7e08a", size: 160 },
  meteoro: { label: "Meteoro caído", cat: "misterios", c1: "#5a4c40", c2: "#ff9a3a", size: 90 },
  olhoCeu: { label: "Fenda no céu", cat: "misterios", c1: "#2b1a40", c2: "#c79bf2", size: 100 },
  /* monstros */
  dragao: { label: "Dragão", cat: "monstros", c1: "#b23a3a", c2: "#f2c46b", size: 120 },
  serpente: { label: "Serpente marinha", cat: "monstros", c1: "#2f8a7a", c2: "#bfe8d8", size: 120 },
  kraken: { label: "Kraken", cat: "monstros", c1: "#8a3a6a", c2: "#f2b6d0", size: 110 },
  golem: { label: "Golem", cat: "monstros", c1: "#8a8278", c2: "#7fd8ff", size: 90 },
  geleia: { label: "Geleia", cat: "monstros", c1: "#6fd36a", c2: "#ffffff", size: 60 },
  ave: { label: "Ave colossal", cat: "monstros", c1: "#c9853a", c2: "#f2e3c2", size: 110 },
  fera: { label: "Fera", cat: "monstros", c1: "#7a6a5a", c2: "#f2e3c2", size: 90 },
  demonio: { label: "Demônio", cat: "monstros", c1: "#7a2a4a", c2: "#ffd34d", size: 100 },
  fantasma: { label: "Fantasma", cat: "monstros", c1: "#e9f4ff", c2: "#5a6a8a", size: 80 },
  caveira: { label: "Caveira", cat: "monstros", c1: "#f2ead8", c2: "#2b2b2b", size: 70 },
  olho: { label: "Olho flutuante", cat: "monstros", c1: "#9a5ab0", c2: "#ffffff", size: 80 },
  aranha: { label: "Aranha gigante", cat: "monstros", c1: "#3a3238", c2: "#d9534f", size: 90 },
  colosso: { label: "Colosso com chifres", cat: "monstros", c1: "#6a5a8a", c2: "#f2e3c2", size: 120 },
  fogoFatuo: { label: "Fogo-fátuo", cat: "monstros", c1: "#7fd8ff", c2: "#ffffff", size: 60 },
  /* veículos */
  navio: { label: "Navio", cat: "veiculos", c1: "#9a6a40", c2: "#f4ecd8", size: 90 },
  barco: { label: "Barco", cat: "veiculos", c1: "#9a6a40", c2: "#e9e2d0", size: 60 },
  aeronave: { label: "Aeronave", cat: "veiculos", c1: "#c0553a", c2: "#e9dcc0", size: 110 },
  trem: { label: "Trem", cat: "veiculos", c1: "#3a4a5a", c2: "#c43c3c", size: 100 },
  balao: { label: "Balão", cat: "veiculos", c1: "#d9534f", c2: "#f2e3c2", size: 80 },
  /* marcadores */
  alfinete: { label: "Alfinete", cat: "marcadores", c1: "#d9534f", c2: "#ffffff", size: 50 },
  estrela: { label: "Estrela", cat: "marcadores", c1: "#f2c94c", c2: "#ffffff", size: 50 },
  tesouro: { label: "X do tesouro", cat: "marcadores", c1: "#c43c3c", c2: "#ffffff", size: 50 },
  bau: { label: "Baú", cat: "marcadores", c1: "#9a6a40", c2: "#e6b84a", size: 50 },
  bandeira: { label: "Bandeira", cat: "marcadores", c1: "#3f6fb0", c2: "#7a5a3a", size: 60 },
  batalha: { label: "Batalha", cat: "marcadores", c1: "#c9ced6", c2: "#7a5a3a", size: 60 },
  coroa: { label: "Coroa", cat: "marcadores", c1: "#f2c94c", c2: "#c43c3c", size: 50 },
  interrogacao: { label: "Mistério (?)", cat: "marcadores", c1: "#6a4c9c", c2: "#ffffff", size: 50 },
  exclamacao: { label: "Alerta (!)", cat: "marcadores", c1: "#e6a23c", c2: "#2b2b2b", size: 50 },
  lar: { label: "Ponto de partida", cat: "marcadores", c1: "#3f9a6a", c2: "#ffffff", size: 50 },
  missao: { label: "Missão", cat: "marcadores", c1: "#f2e3c2", c2: "#c43c3c", size: 50 },
  rosa: { label: "Rosa dos ventos", cat: "marcadores", c1: "#2c3a35", c2: "#c9a24a", size: 140 }
};

/*
 * "Wonderdraft" stamps: ready-made PNG images (2-Minute Tabletop, CC BY-NC 4.0). `img` marks a raster stamp:
 * its colours cannot be changed and its box follows the picture's proportions (w x h).
 */
for ( const [key, e] of Object.entries(WONDERDRAFT) ) {
  STAMPS[key] = {
    label: e.label, cat: "wonderdraft", sub: e.group, img: `${WONDERDRAFT_DIR}/${e.file}`,
    size: e.size, flip: e.flip, w: e.w, h: e.h, c1: "#8c7b6b", c2: "#f4f7fb",
    nameInside: key.startsWith("wd-banner-")
  };
}

/** Font size (map units) of the name shown with a stamp: follows the box's short side; inside banners, its height. */
export function stampNameSize(o) {
  const box = stampBox(o);
  if ( STAMPS[o.key]?.nameInside ) return Math.max(14, box.h * 0.34);
  return Math.max(20, Math.min(o.size * 0.24, Math.min(box.w, box.h) * 0.35));
}

/** Width and height of a stamp's box in map units (square for drawings, the picture's shape for images). */
export function stampBox(o) {
  const meta = STAMPS[o.key];
  if ( !meta?.img || !meta.w || !meta.h ) return { w: o.size, h: o.size };
  const k = o.size / Math.max(meta.w, meta.h);
  return { w: meta.w * k, h: meta.h * k };
}

/* Animations a stamp can have. */
export const STAMP_FX = {
  none: "Nenhuma",
  flutuar: "Flutuar",
  balancar: "Balançar",
  pulsar: "Pulsar",
  brilhar: "Brilhar",
  tremer: "Tremer",
  girar: "Girar",
  piscar: "Piscar",
  respirar: "Respirar",
  sombra: "Aura sombria"
};

/* Name effects. */
export const LABEL_FX = {
  none: "Nenhum",
  brilho: "Brilho",
  cintilar: "Cintilar",
  dourado: "Dourado",
  arcoiris: "Arco-íris",
  fogo: "Fogo",
  gelo: "Gelo",
  eletrico: "Elétrico",
  sombra: "Sombra",
  fantasma: "Fantasma",
  pulsar: "Pulsar",
  flutuar: "Flutuar",
  onda: "Onda",
  runas: "Runas",
  revelar: "Revelar letra a letra",
  arcano: "Arcano"
};

/* Latent mana: Fabula Ultima's damage types except physical (same colours as the card-atlas module). */
export const ELEMENTS = {
  air: { label: "Ar", icon: "fa-solid fa-wind", color: "#9be7c4" },
  bolt: { label: "Raio", icon: "fa-solid fa-bolt", color: "#ffe34d" },
  dark: { label: "Trevas", icon: "fa-solid fa-moon", color: "#a77bff" },
  earth: { label: "Terra", icon: "fa-solid fa-mountain", color: "#d3a356" },
  fire: { label: "Fogo", icon: "fa-solid fa-fire", color: "#ff7a2f" },
  ice: { label: "Gelo", icon: "fa-solid fa-snowflake", color: "#8fe3ff" },
  light: { label: "Luz", icon: "fa-solid fa-sun", color: "#fff1a8" },
  poison: { label: "Veneno", icon: "fa-solid fa-skull-crossbones", color: "#d670a0" }
};

/* Area effects (VFX on the map). */
export const AREA_FX = {
  mana: { label: "Mana latente", icon: "fa-solid fa-hand-sparkles", color: null, r: 90 },
  nevoa: { label: "Névoa", icon: "fa-solid fa-smog", color: "#e8eef2", r: 160 },
  tempestade: { label: "Tempestade", icon: "fa-solid fa-cloud-bolt", color: "#4a5568", r: 140 },
  redemoinho: { label: "Redemoinho", icon: "fa-solid fa-hurricane", color: "#5fa8d3", r: 90 },
  aurora: { label: "Aurora", icon: "fa-solid fa-rainbow", color: "#6ff0b0", r: 200 },
  brilho: { label: "Luzes de fada", icon: "fa-solid fa-wand-magic-sparkles", color: "#fff3a8", r: 100 },
  fumaca: { label: "Fumaça", icon: "fa-solid fa-cloud", color: "#6b6560", r: 80 },
  chuva: { label: "Chuva", icon: "fa-solid fa-cloud-rain", color: "#9cc7e6", r: 130 },
  neve: { label: "Nevasca", icon: "fa-solid fa-snowflake", color: "#ffffff", r: 130 },
  miasma: { label: "Miasma", icon: "fa-solid fa-biohazard", color: "#8a4fd0", r: 120 },
  farol: { label: "Farol", icon: "fa-solid fa-tower-observation", color: "#fff1a8", r: 160 },
  portal: { label: "Portal", icon: "fa-solid fa-circle-notch", color: "#b48cff", r: 70 },
  brasas: { label: "Brasas", icon: "fa-solid fa-fire-flame-curved", color: "#ff8a3a", r: 90 },
  estrelas: { label: "Estrelas cadentes", icon: "fa-solid fa-star", color: "#fff6d0", r: 180 },
  pulso: { label: "Pulso de alerta", icon: "fa-solid fa-circle-exclamation", color: "#ff4d4d", r: 70 },
  bolhas: { label: "Bolhas", icon: "fa-solid fa-circle", color: "#9fe3ff", r: 90 }
};

/* Routes. */
export const ROUTE_STYLES = {
  estrada: { label: "Estrada", color: "#7a5a3a", width: 6 },
  trilha: { label: "Trilha", color: "#6b4a2b", width: 4 },
  maritima: { label: "Rota marítima", color: "#1d4e89", width: 4 },
  rio: { label: "Rio", color: "#4f9fd6", width: 9 },
  fronteira: { label: "Fronteira", color: "#9b1d20", width: 4 },
  ferrovia: { label: "Ferrovia", color: "#3a3a3a", width: 5 },
  aerea: { label: "Rota aérea", color: "#ffffff", width: 4 },
  ley: { label: "Linha de mana", color: "#b48cff", width: 5 },
  muralha: { label: "Muralha", color: "#7f7a74", width: 10 },
  viagem: { label: "Viagem do grupo", color: "#d9534f", width: 5 }
};

/* Region fill patterns and borders. */
export const REGION_PATTERNS = {
  liso: "Cor lisa",
  hachura: "Hachura",
  cruzado: "Hachura cruzada",
  pontos: "Pontilhado",
  listras: "Listras",
  nenhum: "Sem preenchimento"
};
export const REGION_BORDERS = {
  tracejada: "Tracejada",
  continua: "Contínua",
  pontilhada: "Pontilhada",
  brilho: "Brilhante",
  nenhuma: "Sem borda"
};

/** Travel threat (Fabula Ultima, Livro Básico p. 106): the die of the day's Travel Roll. */
export const THREATS = {
  minimo: { label: "Mínimo", die: 6 },
  baixo: { label: "Baixo", die: 8 },
  medio: { label: "Médio", die: 10 },
  alto: { label: "Alto", die: 12 },
  muitoAlto: { label: "Muito alto", die: 20 }
};
export const THREAT_KEYS = Object.keys(THREATS);

/* Map decorations that can be switched on and off. */
export const DECOR = {
  grid: "Grade (quadrados)",
  rhumb: "Linhas de rumo",
  compass: "Rosa dos ventos",
  scale: "Escala (dia de viagem)",
  header: "Cabeçalho (mundo, mapa, região)",
  frame: "Moldura",
  rings: "Ondas na costa",
  waves: "Ondinhas no mar (animadas)",
  clouds: "Nuvens passando (animadas)",
  vignette: "Vinheta nas bordas"
};

/** Fonts for names: Foundry's loaded fonts (core and the ones the GM added) plus common system fonts. */
export function fontChoices() {
  let fonts = [];
  try {
    fonts = foundry.applications?.settings?.menus?.FontConfig?.getAvailableFonts?.() ?? [];
  } catch ( err ) {
    fonts = [];
  }
  if ( !fonts.length ) fonts = Object.keys(globalThis.CONFIG?.fontDefinitions ?? {});
  const extra = ["Signika", "Modesto Condensed", "Amiri", "Georgia", "Palatino Linotype", "Book Antiqua",
    "Times New Roman", "Trebuchet MS", "Impact", "Segoe Script", "Segoe Print", "Courier New"];
  return [...new Set([...fonts, ...extra])];
}
