/**
 * Mapa-mundi-FU: a small fantasy place-name generator (original syllables, not the book's list).
 */
const START = ["Al", "Bel", "Cor", "Dra", "El", "Fen", "Gal", "Hal", "Ir", "Ka", "Lor", "Mir", "Nor", "Or", "Pel", "Quel",
  "Ras", "Sil", "Tor", "Ul", "Val", "Xan", "Yr", "Zel", "Ae", "Bri", "Cael", "Del", "Est", "Fal", "Gwy", "Ith", "Kor", "Lys", "Myr",
  "Nim", "Oss", "Pyr", "Rha", "Sar", "Thal", "Ves", "Wyn", "Aur", "Ceph", "Dun", "Eld", "Fyr", "Hel", "Ily", "Jar", "Lum", "Mor", "Nae"];
const MIDDLE = ["a", "e", "i", "o", "u", "an", "en", "ar", "or", "ia", "eo", "il", "ur", "ae", "ir", "al", "on", "er"];
const END = ["dor", "mar", "thas", "ria", "gard", "lia", "nor", "vel", "cia", "nia", "ton", "fell", "heim", "polis", "os", "um", "ara",
  "wyn", "loth", "dell", "ven", "rim", "zar", "thil", "mont", "sia", "dan", "ris", "gos", "lune", "quia", "bra", "teia"];

const KINDS = {
  lugar: ["{N}"],
  reino: ["Reino de {N}", "Império de {N}", "{N}", "Principado de {N}", "Terras de {N}", "Protetorado de {N}"],
  cidade: ["{N}", "Porto {N}", "Nova {N}", "{N} Alta", "Fortaleza de {N}"],
  mar: ["Mar de {N}", "Mar {A}", "Baía de {N}", "Estreito de {N}", "Golfo de {N}", "Oceano {A}"],
  montanha: ["Montes {N}", "Pico de {N}", "Serra {AF}", "Cordilheira de {N}", "Monte {N}"],
  floresta: ["Floresta de {N}", "Bosque {A}", "Mata de {N}", "Selva de {N}"],
  deserto: ["Deserto de {N}", "Dunas {AFP}", "Ermo de {N}"],
  ilha: ["Ilha de {N}", "Ilhas {AFP}", "Arquipélago de {N}", "Ilha {N}"],
  misterio: ["Ruínas de {N}", "Torre de {N}", "Santuário de {N}", "Portal de {N}", "Abismo de {N}"]
};
/* [masculine, feminine] */
const ADJ = [["Esquecido", "Esquecida"], ["Sereno", "Serena"], ["Rubro", "Rubra"], ["Cinzento", "Cinzenta"], ["Dourado", "Dourada"],
  ["Uivante", "Uivante"], ["Profundo", "Profunda"], ["Sombrio", "Sombria"], ["Celeste", "Celeste"], ["Eterno", "Eterna"],
  ["Partido", "Partida"], ["Gélido", "Gélida"], ["Ardente", "Ardente"], ["Silencioso", "Silenciosa"], ["Encantado", "Encantada"],
  ["Perdido", "Perdida"], ["Brumoso", "Brumosa"], ["Estrelado", "Estrelada"]];

const pick = (list, r) => list[Math.floor(r() * list.length)];

export function placeName(r = Math.random) {
  const join = (a, b) => (a.slice(-1).toLowerCase() === b[0].toLowerCase() ? a + b.slice(1) : a + b);
  let n = pick(START, r);
  if ( r() < 0.45 ) n = join(n, pick(MIDDLE, r));
  n = join(n, pick(END, r));
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

/** Guess a kind of name from a stamp key (montanha, floresta...). */
export function kindForStamp(key) {
  if ( String(key).startsWith("wd-") ) {
    if ( /mountain|hill|volcano/.test(key) ) return "montanha";
    if ( /forest|tree|bamboo/.test(key) ) return "floresta";
    if ( /tower|shrine|pyramid|ziggurat|dwarf-gate|mine/.test(key) ) return "misterio";
    if ( /settlement/.test(key) ) return "cidade";
    if ( /ship/.test(key) ) return "mar";
    return "lugar";
  }
  if ( /montanha|cordilheira|pico|vulcao|mesa|rochedo/.test(key) ) return "montanha";
  if ( /floresta|bosque|arvore|pinheiro|anciao|palmeira|cogumelos/.test(key) ) return "floresta";
  if ( /dunas|cactos/.test(key) ) return "deserto";
  if ( /vila|cidade|capital|castelo|fortaleza|porto/.test(key) ) return "cidade";
  if ( /lago|redemoinho|ondas|serpente|kraken|recife/.test(key) ) return "mar";
  if ( /ruinas|torre|portal|obelisco|santuario|templo|caverna|cristal|olhoCeu/.test(key) ) return "misterio";
  if ( /ilha/.test(key) ) return "ilha";
  return "lugar";
}

export function generateName(kind = "lugar", r = Math.random) {
  const templates = KINDS[kind] ?? KINDS.lugar;
  const [m, f] = pick(ADJ, r);
  return pick(templates, r).replace("{N}", placeName(r)).replace("{AFP}", `${f}s`).replace("{AF}", f).replace("{A}", m);
}

export const NAME_KINDS = {
  lugar: "Lugar", reino: "Reino ou nação", cidade: "Cidade", mar: "Mar ou baía", montanha: "Montanha",
  floresta: "Floresta", deserto: "Deserto", ilha: "Ilha", misterio: "Lugar misterioso"
};
