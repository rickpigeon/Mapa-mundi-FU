/**
 * Mapa-mundi-FU: the World Sheet (page 1 of the Fabula Ultima World Sheets). Everybody reads it;
 * the GM writes it and can hide any part from the players. Inspiration tables paraphrase
 * the Livro Básico (p. 150-151).
 */
import { MODULE_ID, MODULE_TITLE, escapeHTML, uid } from "./constants.mjs";
import { SHEET_FIELDS, getMap, getSheet, hasPending, normalizeMap, normalizeSheet, saveMap, saveSheet } from "./store.mjs";
import { generateName } from "./names.mjs";
import { guard, reportError } from "./errors.mjs";

const { ApplicationV2 } = foundry.applications.api;
const APP_ID = `${MODULE_ID}-ficha`;
const h = escapeHTML;

/* Paraphrases of the Livro Básico world creation tables (p. 150-151). */
const MAGIC = [
  "A tecnomagia desequilibra a natureza.", "Quem usa magia carrega uma marca no corpo.", "A magia passa de geração em geração, pelo sangue.",
  "A magia surgiu há pouco tempo.", "Os povos antigos viviam em paz com as criaturas mágicas.", "Toda a magia nasce de um único lugar sagrado.",
  "Uma magia antiga e poderosa sustenta o mundo.", "A tecnologia é vista como profana.", "Uma distopia científica faz experimentos com magia.",
  "A magia é um presente dos deuses.", "A magia vem de outra dimensão.", "Quem nasce em certos lugares não consegue usar magia.",
  "Aeronaves mudaram as viagens e as guerras.", "A magia é proibida em quase todo lugar.", "Conjuradores estudam em academias e servem a nobres.",
  "Máquinas a vapor são comuns e golens marcham nos exércitos.", "O mundo quase acabou numa era passada.", "Foram os dragões que ensinaram a magia.",
  "Os monstros nascem das almas sem descanso dos mortos.", "A magia vem de cristais antigos."
];
const NATIONS = ["Império", "Reino", "Aldeias", "Cidade-estado", "União", "Reino sagrado", "Clãs", "Protetorado"];
const EVENTS = [
  "Morre uma figura importante.", "Os monstros andam inquietos e agressivos.", "Um meteoro vai cair no mundo.", "O nível dos oceanos está subindo.",
  "Terras inexploradas são descobertas.", "Um mal antigo está despertando.", "O próprio mundo está se transformando.", "A lua é destruída.",
  "Chegam visitantes de outro mundo.", "As pessoas caíram numa apatia estranha.", "Uma potência militar se ergue.", "Os deuses abandonam o mundo.",
  "Um monstro lendário aparece.", "Uma escuridão cobre o mundo.", "A magia está minguando aos poucos.", "Um salto tecnológico muda tudo.",
  "Um portal dimensional se abre.", "Um conhecimento importante se perde.", "Uma religião nova se espalha.", "O mundo está morrendo."
];
const SHAPES = ["Redondo, como um planeta.", "Plano, com bordas que ninguém alcançou.", "Regiões flutuantes em meio às nuvens.",
  "Em forma de rosquinha, com um oceano que toca todos os continentes.", "Ninguém descobriu ainda a forma do mundo."];

const ROLLS = {
  shape: { table: SHAPES, label: "formato" },
  magic: { table: MAGIC, label: "d20" },
  history: { table: EVENTS, label: "d20" },
  mysteries: { table: EVENTS, label: "d20" },
  threats: { table: EVENTS, label: "d20" }
};

export class WorldSheetApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ["mapa-mundi-fu", "mmfu-sheet-app"],
    window: { title: "Ficha do mundo", icon: "fa-solid fa-scroll", resizable: true },
    position: { width: 980, height: 760 }
  };

  static open() {
    const existing = foundry.applications.instances.get(APP_ID);
    if ( existing ) {
      existing.bringToFront?.();
      return existing;
    }
    const app = new WorldSheetApp();
    app.render({ force: true });
    return app;
  }

  /** Stored data changed: redraw, unless the GM is typing here or still has edits waiting to be saved. */
  static refresh() {
    const app = foundry.applications.instances.get(APP_ID);
    if ( !app?.root || app.typing ) return;
    if ( game.user.isGM && hasPending() ) return;
    app.sheet = getSheet();
    app.paint();
  }

  constructor(options = {}) {
    super(options);
    this.sheet = getSheet();
    this.root = null;
    this.typing = false;
  }

  get asGM() {
    return game.user.isGM;
  }

  async _renderHTML() {
    if ( !this.root ) {
      this.root = document.createElement("div");
      this.root.className = "mmfu-sheet";
      this.root.addEventListener("click", guard(ev => this.onClick(ev), "ficha"));
      this.root.addEventListener("input", guard(ev => this.onInput(ev, true), "ficha"));
      this.root.addEventListener("change", guard(ev => this.onInput(ev, false), "ficha"));
      this.root.addEventListener("focusin", () => (this.typing = true));
      this.root.addEventListener("focusout", () => {
        this.typing = false;
      });
      this.paint();
    }
    return this.root;
  }

  _replaceHTML(result, content) {
    if ( result.parentElement !== content ) content.replaceChildren(result);
  }

  /** Draw the sheet (this.sheet holds the latest data, local edits included). */
  paint() {
    const s = this.sheet;
    const gm = this.asGM;
    const world = getMap().info.world;
    const field = (k, label) => {
      if ( !gm && s.hidden[k] ) return "";
      const roll = gm && ROLLS[k] ? `<button type="button" class="mf-mini" data-act="roll" data-key="${k}" data-tooltip="Inspiração (Livro Básico p. ${k === "shape" ? 149 : 150 - (k === "magic" ? 0 : -1)})"><i class="fa-solid fa-dice-d20"></i></button>` : "";
      const eye = gm ? `<button type="button" class="mf-mini${s.hidden[k] ? " is-warn" : ""}" data-act="hide" data-key="${k}" data-tooltip="${s.hidden[k] ? "Escondido dos jogadores" : "Visível para os jogadores"}"><i class="fa-solid ${s.hidden[k] ? "fa-eye-slash" : "fa-eye"}"></i></button>` : "";
      const body = gm
        ? `<textarea data-field="${k}" rows="${k === "shape" ? 3 : 6}">${h(s.fields[k])}</textarea>`
        : `<div class="ws-text">${s.fields[k] ? h(s.fields[k]).replace(/\n/g, "<br>") : "<em>Nada escrito ainda.</em>"}</div>`;
      return `<section class="ws-field${s.hidden[k] ? " is-hidden" : ""}"><header><span>${h(label)}</span>${roll}${eye}</header>${body}</section>`;
    };
    const nations = s.nations.filter(n => gm || !n.hidden).map(n => {
      if ( !gm ) {
        return `<article class="ws-nation" style="--nc:${n.color}"><header><b>${h(n.name || "Sem nome")}</b>${n.kind ? `<span>${h(n.kind)}</span>` : ""}</header>`
          + `<div class="ws-text">${h(n.text).replace(/\n/g, "<br>")}</div></article>`;
      }
      const kinds = ["", ...NATIONS].map(k => `<option value="${h(k)}"${k === n.kind ? " selected" : ""}>${h(k || "Tipo...")}</option>`).join("");
      return `<article class="ws-nation${n.hidden ? " is-hidden" : ""}" style="--nc:${n.color}" data-id="${n.id}">`
        + `<header><input type="color" data-nation="color" value="${n.color}"><input type="text" data-nation="name" value="${h(n.name)}" placeholder="Nome do reino ou nação">`
        + `<button type="button" class="mf-mini" data-act="nation-name" data-tooltip="Sortear nome"><i class="fa-solid fa-dice"></i></button>`
        + `<select data-nation="kind">${kinds}</select>`
        + `<button type="button" class="mf-mini${n.hidden ? " is-warn" : ""}" data-act="nation-hide" data-tooltip="${n.hidden ? "Escondido dos jogadores" : "Visível para os jogadores"}"><i class="fa-solid ${n.hidden ? "fa-eye-slash" : "fa-eye"}"></i></button>`
        + `<button type="button" class="mf-mini mf-danger" data-act="nation-del" data-tooltip="Excluir"><i class="fa-solid fa-trash"></i></button></header>`
        + `<textarea data-nation="text" rows="3" placeholder="Costumes, crenças, indústrias, habitantes, criaturas, relações...">${h(n.text)}</textarea></article>`;
    }).join("");
    this.root.innerHTML = `
      <div class="ws-cols">
        <div class="ws-col">
          <h2 class="ws-band">Informações do mundo</h2>
          ${gm ? `<label class="ws-name"><span>Nome do mundo</span><input type="text" data-world="name" value="${h(world)}" placeholder="Também aparece no cabeçalho do mapa"></label>` : (world ? `<h1 class="ws-title">${h(world)}</h1>` : "")}
          ${Object.entries(SHEET_FIELDS).map(([k, label]) => field(k, label)).join("")}
        </div>
        <div class="ws-col">
          <h2 class="ws-band">Países, reinos e nações conhecidos</h2>
          ${nations || `<p class="mf-hint">${gm ? "Livro Básico p. 149: cada pessoa à mesa contribui com ao menos um reino ou nação." : "Nenhum reino conhecido ainda."}</p>`}
          ${gm ? `<div class="mf-actions"><button type="button" data-act="nation-add"><i class="fa-solid fa-plus"></i> Novo reino ou nação</button><button type="button" data-act="nation-roll"><i class="fa-solid fa-dice-d6"></i> Sortear tipo (d8)</button></div>` : ""}
        </div>
      </div>`;
  }

  save() {
    if ( !this.asGM ) return;
    saveSheet(normalizeSheet(this.sheet)).catch(err => reportError(err, "salvar a ficha"));
  }

  async onClick(ev) {
    const el = ev.target.closest("[data-act]");
    if ( !el || !this.asGM ) return;
    const s = this.sheet;
    const card = el.closest("[data-id]");
    const nation = card ? s.nations.find(n => n.id === card.dataset.id) : null;
    switch ( el.dataset.act ) {
      case "roll": {
        const k = el.dataset.key;
        const table = ROLLS[k].table;
        const i = Math.floor(Math.random() * table.length);
        const line = `${table.length === 20 ? `(d20: ${i + 1}) ` : ""}${table[i]}`;
        s.fields[k] = s.fields[k] ? `${s.fields[k]}\n${line}` : line;
        break;
      }
      case "hide":
        s.hidden[el.dataset.key] = !s.hidden[el.dataset.key];
        break;
      case "nation-add":
        s.nations.push({ id: uid("n"), name: "", kind: "", text: "", color: "#9b1d20", hidden: false });
        break;
      case "nation-roll": {
        const kind = NATIONS[Math.floor(Math.random() * 8)];
        s.nations.push({ id: uid("n"), name: generateName("reino"), kind, text: "", color: "#3f6fb0", hidden: false });
        ui.notifications.info(`d8: ${kind}`);
        break;
      }
      case "nation-name":
        if ( nation ) nation.name = generateName("reino");
        break;
      case "nation-hide":
        if ( nation ) nation.hidden = !nation.hidden;
        break;
      case "nation-del":
        if ( nation ) s.nations = s.nations.filter(n => n !== nation);
        break;
      default:
        return;
    }
    this.typing = false;
    this.save();
    this.paint();
  }

  onInput(ev, live) {
    if ( !this.asGM ) return;
    const el = ev.target;
    const s = this.sheet;
    if ( el.dataset.field ) s.fields[el.dataset.field] = el.value;
    else if ( el.dataset.nation ) {
      const n = s.nations.find(x => x.id === el.closest("[data-id]")?.dataset.id);
      if ( !n ) return;
      n[el.dataset.nation] = el.value;
      if ( el.dataset.nation === "color" ) el.closest(".ws-nation").style.setProperty("--nc", el.value);
    }
    else if ( el.dataset.world === "name" ) {
      if ( !live ) this.setWorldName(el.value);
      return;
    }
    else return;
    this.save();
  }

  /** The world's name lives in the map header, so the open map window (if any) applies it. */
  async setWorldName(name) {
    const { MapApp } = await import("./map-app.mjs");
    const app = MapApp.instance;
    if ( app?.mv ) {
      app.pushHistory();
      app.mapData.info.world = String(name).slice(0, 80);
      app.commitMap({ panel: true });
      return;
    }
    const map = getMap();
    map.info.world = String(name).slice(0, 80);
    map.rev += 1;
    await saveMap(normalizeMap(map), 0);
  }
}

export const SHEET_TITLE = `${MODULE_TITLE}: ficha do mundo`;
