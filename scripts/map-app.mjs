/**
 * Mapa-mundi-FU: the map window. Everybody can look (pan, zoom, places, ruler, signals); only the GM edits.
 * ApplicationV2 without templates: the shell is built once and then updated by hand, so the canvas,
 * the view and the animations survive every edit.
 */
import { CELL, MAP_H, MAP_W, MODULE_ID, MODULE_TITLE, formatDays, uid } from "./constants.mjs";
import { AREA_FX, ROUTE_STYLES, STAMPS, THREATS, THREAT_KEYS } from "./catalog.mjs";
import { encodePoints, flatten, pairs, pointInPolygon, polylineLength, samplePolyline, simplify } from "./geometry.mjs";
import { SHAPE_LAND } from "./generator.mjs";
import { MapView, themeOf } from "./view.mjs";
import { POINT_SCALE } from "./paint.mjs";
import {
  flushAll, getMap, getPaint, normalizeMap, normalizeObject, paintSize, saveMap, savePaint, setting
} from "./store.mjs";
import { HINTS, TOOLS, inspector, mapPanel, placesPanel, toolPanel } from "./panels.mjs";
import { emitFocus, emitOpen, emitPing, userColor } from "./broadcast.mjs";
import { postToChat } from "./chat.mjs";
import { downloadPNG } from "./export.mjs";
import { generateName, kindForStamp } from "./names.mjs";
import { guard, reportError } from "./errors.mjs";

const { ApplicationV2 } = foundry.applications.api;
const APP_ID = `${MODULE_ID}-janela`;
const PREFS_KEY = `${MODULE_ID}.prefs`;
const FLIPPABLE = new Set(["relevo", "vegetacao", "monstros", "veiculos", "agua"]);

const DEFAULT_PREFS = {
  color: "#4f7d45",
  recent: [],
  brush: { size: 40, opacity: 0.85, soft: 0.35, clip: "l" },
  texture: { key: "floresta", size: 80, opacity: 1, clip: "l" },
  eraser: { size: 50, clip: "a" },
  stamp: { key: "montanha", cat: "relevo", sub: "montanhas", size: null, tint: false, color: "#8c7b6b", scatter: false, jitter: true, fx: "none", hidden: false },
  label: { text: "", kind: "lugar", font: "Signika", size: 44, color: "#2b2b2b", outline: "#ffffff", outlineW: 3, fx: "none", fxColor: "#ffd34d", caps: true, bold: true, italic: false, hidden: false },
  fx: { kind: "mana", element: "fire", r: null, color: null, intensity: 2, hidden: false },
  route: { style: "estrada", color: null, width: null, arrow: false, smooth: true, hidden: false },
  region: { color: "#9b1d20", opacity: 0.22, pattern: "hachura", border: "tracejada", threat: null, hidden: false }
};

function loadPrefs() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") ?? {};
  } catch ( err ) {
    saved = {};
  }
  const prefs = structuredClone(DEFAULT_PREFS);
  for ( const [k, v] of Object.entries(saved) ) {
    if ( !(k in prefs) ) continue;
    if ( prefs[k] && typeof prefs[k] === "object" && !Array.isArray(prefs[k]) && v && typeof v === "object" ) Object.assign(prefs[k], v);
    else if ( typeof v === typeof prefs[k] ) prefs[k] = v;
  }
  if ( !STAMPS[prefs.stamp.key] ) prefs.stamp.key = "montanha";
  if ( !Array.isArray(prefs.recent) ) prefs.recent = [];
  return prefs;
}

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

function readValue(el) {
  const type = el.dataset.type;
  if ( type === "bool" ) return el.checked;
  if ( type === "num" ) return Number(el.value);
  if ( type === "nstr" || type === "ncolor" ) return el.value === "" ? null : el.value;
  return el.value;
}

function dragData(event) {
  try {
    const TE = foundry.applications?.ux?.TextEditor?.implementation;
    if ( TE?.getDragEventData ) return TE.getDragEventData(event);
  } catch ( err ) { /* fall back */ }
  try {
    return JSON.parse(event.dataTransfer?.getData("text/plain") || "null");
  } catch ( err ) {
    return null;
  }
}

export class MapApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: APP_ID,
    classes: ["mapa-mundi-fu", "mmfu-app"],
    window: { title: MODULE_TITLE, icon: "fa-solid fa-map-location-dot", resizable: true },
    position: { width: 1280, height: 820 }
  };

  /* ---------------------------------------------------------------------------------------------- */
  /* Opening                                                                                          */
  /* ---------------------------------------------------------------------------------------------- */

  static get instance() {
    return foundry.applications.instances.get(APP_ID) ?? null;
  }

  /** Open (or bring up) the map. `point` = { x, y, zoom } to look at. */
  static open(point = null) {
    let app = MapApp.instance;
    if ( !app ) {
      const width = Math.min(1500, Math.max(760, window.innerWidth - 120));
      const height = Math.min(960, Math.max(520, window.innerHeight - 80));
      app = new MapApp({ position: { width, height, left: Math.max(10, (window.innerWidth - width) / 2), top: Math.max(10, (window.innerHeight - height) / 2) } });
      app.pendingPoint = point;
      app.render({ force: true });
    }
    else {
      if ( app.minimized ) app.maximize?.();
      app.bringToFront?.();
      if ( point && app.mv ) app.lookAt(point);
    }
    return app;
  }

  static onSetting(key) {
    const app = MapApp.instance;
    if ( app?.mv ) app.onRemote(key);
  }

  static focus(point) {
    const app = MapApp.instance;
    if ( app?.mv ) app.lookAt(point);
    else MapApp.open(point);
  }

  static ping(point, user) {
    const app = MapApp.instance;
    if ( app?.mv ) app.mv.ping(point.x, point.y, userColor(user), user?.name ?? "");
  }

  constructor(options = {}) {
    super(options);
    this.ed = { tool: "select", mode: "edit", tab: game.user.isGM ? "tool" : "places", full: null, query: "" };
    this.prefs = loadPrefs();
    this.mapData = getMap();
    this.paintData = getPaint();
    this.selection = new Set();
    this.history = [];
    this.future = [];
    this.drag = null;
    this.draft = null;
    this.ruler = null;
    this.shell = null;
    this.mv = null;
    this.keysDown = new Set();
    this.gestureOpen = false;
  }

  get editing() {
    return game.user.isGM && this.ed.mode === "edit";
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Rendering (built once)                                                                           */
  /* ---------------------------------------------------------------------------------------------- */

  async _renderHTML() {
    this.shell ??= this.buildShell();
    return this.shell;
  }

  _replaceHTML(result, content) {
    if ( result.parentElement !== content ) content.replaceChildren(result);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if ( this.mv ) return;
    try {
      this.mv = new MapView(this.shell.querySelector(".mmfu-stage-el"), {
        res: Number(setting("qualidade", "1.5")) || 1.5,
        onView: () => this.onViewChanged()
      });
      this.applyAnimPref();
      this.mv.paint.setStrokes(this.paintData.strokes);
      this.mv.paint.setImage(this.paintData.image);
      this.bindEvents();
      this.renderAll();
      requestAnimationFrame(() => {
        this.mv.fit();
        if ( this.pendingPoint ) this.lookAt(this.pendingPoint);
        this.pendingPoint = null;
      });
    } catch ( err ) {
      reportError(err, "abrir o mapa");
    }
  }

  async _onClose(options) {
    await super._onClose?.(options);
    window.removeEventListener("keyup", this.boundKeyUp);
    Hooks.off(`${MODULE_ID}.prefs`, this.prefsHook);
    flushAll().catch(err => reportError(err, "salvar"));
  }

  buildShell() {
    const gm = game.user.isGM;
    const el = document.createElement("div");
    el.className = `mmfu-shell${gm ? " is-gm" : ""}`;
    const btn = (act, icon, tip, extra = "") => `<button type="button" class="mmfu-tb" data-act="${act}" data-tooltip="${tip}" aria-label="${tip}"${extra}><i class="${icon}"></i></button>`;
    const rail = Object.entries(TOOLS).map(([k, t]) => `<button type="button" class="mmfu-tool" data-act="tool" data-tool="${k}" data-tooltip="${t.label} (${t.key})" aria-label="${t.label}"><i class="${t.icon}"></i></button>`).join("");
    el.innerHTML = `
      <div class="mmfu-top">
        ${gm ? `<div class="mmfu-modes"><button type="button" data-act="mode" data-mode="edit"><i class="fa-solid fa-pen-ruler"></i> Editar</button><button type="button" data-act="mode" data-mode="view"><i class="fa-solid fa-eye"></i> Ver como jogador</button></div>
        ${btn("undo", "fa-solid fa-rotate-left", "Desfazer (Ctrl+Z)")}${btn("redo", "fa-solid fa-rotate-right", "Refazer (Ctrl+Y)")}` : `<div class="mmfu-player-title"><i class="fa-solid fa-map-location-dot"></i> <span class="t-world"></span></div>`}
        <div class="mmfu-spacer"></div>
        ${btn("zoom-out", "fa-solid fa-magnifying-glass-minus", "Afastar")}${btn("fit", "fa-solid fa-expand", "Mapa inteiro")}${btn("zoom-in", "fa-solid fa-magnifying-glass-plus", "Aproximar")}
        ${gm ? "" : btn("tool", "fa-solid fa-ruler", "Medir dias de viagem (M)", ` data-tool="ruler"`)}
        ${btn("sheet", "fa-solid fa-scroll", "Ficha do mundo")}
        ${gm ? btn("show-all", "fa-solid fa-users", "Abrir o mapa para todos os jogadores") + btn("focus-all", "fa-solid fa-bullseye", "Levar a vista de todos para cá") : ""}
        ${btn("export", "fa-solid fa-image", "Salvar como imagem PNG")}
        ${btn("full", "fa-solid fa-up-right-and-down-left-from-center", "Ocupar a tela toda")}
      </div>
      <div class="mmfu-body">
        ${gm ? `<div class="mmfu-rail">${rail}</div>` : ""}
        <div class="mmfu-stagebox"><div class="mmfu-stage-el" tabindex="0" data-keyboard-focus="true"></div></div>
        <div class="mmfu-side">
          <div class="mmfu-tabs">
            ${gm ? `<button type="button" data-act="tab" data-tab="tool">Ferramenta</button><button type="button" data-act="tab" data-tab="map">Mapa</button>` : ""}
            <button type="button" data-act="tab" data-tab="places">Lugares</button>
          </div>
          <div class="mmfu-pane"></div>
        </div>
      </div>
      <div class="mmfu-status"><span class="s-hint"></span><span class="s-coord"></span><span class="s-zoom"></span><span class="s-save"></span></div>`;
    return el;
  }

  renderAll() {
    this.renderMap();
    this.renderChrome();
    this.renderPanel();
  }

  renderMap() {
    if ( !this.mv ) return;
    this.mv.setMap(this.mapData, { gm: game.user.isGM, showHidden: this.editing, selection: this.selection });
    this.renderSel();
    this.renderTitle();
  }

  renderSel() {
    if ( !this.mv ) return;
    this.mv.renderSelection(this.editing && this.ed.tool === "select" ? this.selectedObjects() : []);
  }

  renderTitle() {
    const world = this.mapData.info.world;
    const title = world ? `${MODULE_TITLE}: ${world}` : MODULE_TITLE;
    try {
      const el = this.window?.title;
      if ( el instanceof HTMLElement ) el.textContent = title;
    } catch ( err ) { /* window title is cosmetic */ }
    const t = this.shell.querySelector(".t-world");
    if ( t ) t.textContent = world || "Mapa-múndi";
  }

  renderChrome() {
    const s = this.shell;
    s.classList.toggle("is-editing", this.editing);
    s.classList.toggle("is-viewing", !this.editing);
    s.querySelectorAll("[data-act=mode]").forEach(b => b.classList.toggle("is-on", b.dataset.mode === this.ed.mode));
    s.querySelectorAll("[data-act=tool]").forEach(b => b.classList.toggle("is-on", b.dataset.tool === this.ed.tool && (this.editing || b.dataset.tool === "ruler")));
    s.querySelectorAll("[data-act=tab]").forEach(b => b.classList.toggle("is-on", b.dataset.tab === this.currentTab()));
    const undo = s.querySelector("[data-act=undo]"), redo = s.querySelector("[data-act=redo]");
    if ( undo ) undo.disabled = !this.history.length;
    if ( redo ) redo.disabled = !this.future.length;
    const stage = this.mv?.root;
    if ( stage ) {
      for ( const k of Object.keys(TOOLS) ) stage.classList.remove(`tool-${k}`);
      stage.classList.add(`tool-${this.activeTool()}`);
      stage.classList.toggle("is-view", !this.editing);
    }
    this.renderStatus();
  }

  currentTab() {
    if ( !this.editing ) return "places";
    return this.ed.tab;
  }

  /** The tool in effect: players and the GM's player view only have the ruler and the hand. */
  activeTool() {
    if ( this.editing ) return this.ed.tool;
    return this.ed.tool === "ruler" ? "ruler" : "view";
  }

  renderPanel() {
    const pane = this.shell.querySelector(".mmfu-pane");
    const scroll = pane.scrollTop;
    const tab = this.currentTab();
    let html = "";
    if ( tab === "places" ) html = placesPanel(this, this.mapData.objects.filter(o => this.editing || !o.hidden), this.ed.query);
    else if ( tab === "map" ) html = mapPanel(this);
    else {
      const sel = this.selectedObjects();
      html = this.ed.tool === "select" && sel.length ? inspector(this, sel) : toolPanel(this);
    }
    pane.innerHTML = html;
    pane.scrollTop = scroll;
    if ( tab === "places" && this.ed.query ) this.filterPlaces(this.ed.query);
  }

  renderStatus(x = null, y = null) {
    const s = this.shell;
    s.querySelector(".s-hint").textContent = HINTS[this.activeTool()] ?? "";
    if ( x !== null ) {
      const inside = x >= 0 && y >= 0 && x <= MAP_W && y <= MAP_H;
      s.querySelector(".s-coord").textContent = inside ? `Quadrado ${Math.floor(x / CELL) + 1}, ${Math.floor(y / CELL) + 1}` : "";
    }
    if ( this.mv ) s.querySelector(".s-zoom").textContent = `${Math.round((this.mv.view.s / this.mv.fitScale()) * 100)}%`;
  }

  setSaveState(text) {
    const el = this.shell?.querySelector(".s-save");
    if ( el ) el.textContent = text;
  }

  onViewChanged() {
    if ( !this.shell ) return;
    this.renderStatus();
    cancelAnimationFrame(this.selFrame);
    this.selFrame = requestAnimationFrame(() => {
      this.renderSel();
      if ( this.ruler ) this.drawRuler();
      if ( this.draft ) this.drawDraft();
    });
  }

  applyAnimPref() {
    const anim = setting("animacoes", "full");
    const stage = this.mv.root;
    stage.classList.toggle("anim-reduced", anim === "reduced");
    stage.classList.toggle("anim-off", anim === "off");
    const res = Number(setting("qualidade", "1.5")) || 1.5;
    if ( res !== this.mv.paint.res ) this.mv.setResolution(res);
  }

  lookAt(point) {
    if ( !point || !this.mv ) return;
    this.mv.centerOn(point.x, point.y, point.zoom ?? null);
    this.mv.ping(point.x, point.y, "#ffffff");
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Data, history, saving                                                                            */
  /* ---------------------------------------------------------------------------------------------- */

  selectedObjects() {
    return this.mapData.objects.filter(o => this.selection.has(o.id));
  }

  objectById(id) {
    return this.mapData.objects.find(o => o.id === id) ?? null;
  }

  snapshot() {
    return { map: JSON.stringify({ ...this.mapData, rev: 0 }), strokes: this.paintData.strokes.slice(), image: this.paintData.image };
  }

  pushHistory() {
    this.history.push(this.snapshot());
    if ( this.history.length > 80 ) this.history.shift();
    this.future = [];
  }

  /** Open an undo step once per gesture (a drag, a slider move, a typed field). */
  beginGesture() {
    if ( this.gestureOpen ) return;
    this.pushHistory();
    this.gestureOpen = true;
  }

  endGesture() {
    this.gestureOpen = false;
    this.renderChrome();
  }

  restore(snap) {
    const rev = this.mapData.rev;
    this.mapData = normalizeMap(JSON.parse(snap.map));
    this.mapData.rev = rev;
    const imageChanged = (snap.image ?? "") !== this.paintData.image;
    const paintChanged = imageChanged || snap.strokes.length !== this.paintData.strokes.length || snap.strokes.some((s, i) => s !== this.paintData.strokes[i]);
    if ( paintChanged ) {
      this.paintData.strokes = snap.strokes.slice();
      this.paintData.image = snap.image ?? "";
      this.mv.paint.setImage(this.paintData.image);
      this.mv.paint.setStrokes(this.paintData.strokes);
      this.commitPaint();
    }
    for ( const id of [...this.selection] ) if ( !this.objectById(id) ) this.selection.delete(id);
    this.commitMap({ panel: true });
  }

  undo() {
    if ( !this.history.length ) return;
    this.future.push(this.snapshot());
    this.restore(this.history.pop());
    this.renderChrome();
  }

  redo() {
    if ( !this.future.length ) return;
    this.history.push(this.snapshot());
    this.restore(this.future.pop());
    this.renderChrome();
  }

  commitMap({ panel = false, render = true } = {}) {
    if ( !game.user.isGM ) return;
    this.mapData.rev += 1;
    if ( render ) this.renderMap();
    if ( panel ) this.renderPanel();
    this.setSaveState("Salvando...");
    saveMap(JSON.parse(JSON.stringify(this.mapData))).then(() => this.setSaveState("Salvo")).catch(err => reportError(err, "salvar o mapa"));
  }

  commitPaint() {
    if ( !game.user.isGM ) return;
    this.paintData.rev += 1;
    this.setSaveState("Salvando...");
    const data = { rev: this.paintData.rev, image: this.paintData.image, strokes: this.paintData.strokes };
    savePaint(data).then(() => this.setSaveState("Salvo")).catch(err => reportError(err, "salvar a pintura"));
    /* every save sends the whole painting to every player: past ~600 KB suggest flattening it */
    const size = paintSize(data);
    if ( size > 600000 && !this.warnedSize ) {
      this.warnedSize = true;
      ui.notifications.warn(`${MODULE_TITLE}: a pintura está grande (${Math.round(size / 1024)} KB). Use Mapa > Pintura > Consolidar para deixá-la leve.`, { permanent: true });
    }
  }

  /** Flatten the painting into an image file in the world folder; the stroke list starts empty again. */
  async consolidatePaint() {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
    if ( !FP?.upload ) throw new Error("o envio de arquivos não está disponível");
    const dir = `worlds/${game.world.id}/${MODULE_ID}`;
    try {
      await FP.createDirectory("data", dir, {});
    } catch ( err ) { /* already there */ }
    this.setSaveState("Consolidando...");
    const blob = await new Promise(resolve => this.mv.paint.canvas.toBlob(resolve, "image/webp", 0.92));
    if ( !blob ) throw new Error("o navegador não gerou a imagem da pintura");
    const name = `pintura-${Date.now()}.webp`;
    const result = await FP.upload("data", dir, new File([blob], name, { type: "image/webp" }), {}, { notify: false });
    if ( result === false || result?.status === "error" ) throw new Error(result?.message ?? "o servidor recusou o arquivo");
    const path = result?.path ?? `${dir}/${name}`;
    await this.mv.paint.setImage(path);
    this.paintData.image = path;
    this.paintData.strokes = [];
    this.mv.paint.setStrokes([]);
    this.history = [];
    this.future = [];
    this.warnedSize = false;
    this.commitPaint();
    this.renderChrome();
    this.renderPanel();
    ui.notifications.info(`${MODULE_TITLE}: pintura consolidada em ${path}.`);
  }

  /** A setting changed somewhere (this client's own saves come back too and are skipped). */
  onRemote(key) {
    if ( key === "mapa" ) {
      const incoming = getMap();
      if ( game.user.isGM && incoming.rev <= this.mapData.rev ) return;
      this.mapData = incoming;
      for ( const id of [...this.selection] ) if ( !this.objectById(id) ) this.selection.delete(id);
      this.renderMap();
      if ( !this.editing || this.currentTab() === "places" ) this.renderPanel();
    }
    else if ( key === "pintura" ) {
      const incoming = getPaint();
      if ( game.user.isGM && incoming.rev <= this.paintData.rev ) return;
      this.paintData = incoming;
      this.mv.paint.setImage(incoming.image);
      this.mv.paint.setStrokes(incoming.strokes);
    }
  }

  savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch ( err ) { /* private mode */ }
  }

  rememberColor(c) {
    if ( !c ) return;
    this.prefs.recent = [c, ...this.prefs.recent.filter(x => x !== c)].slice(0, 10);
    this.savePrefs();
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Events                                                                                           */
  /* ---------------------------------------------------------------------------------------------- */

  bindEvents() {
    const s = this.shell;
    const stage = this.mv.root;
    s.addEventListener("click", guard(ev => this.onClick(ev), "clique"));
    s.addEventListener("input", guard(ev => this.onField(ev, true), "campo"));
    s.addEventListener("change", guard(ev => this.onField(ev, false), "campo"));
    s.addEventListener("keydown", guard(ev => this.onKeyDown(ev), "teclado"));
    s.addEventListener("dragover", ev => {
      if ( this.editing ) ev.preventDefault();
    });
    s.addEventListener("drop", guard(ev => this.onDrop(ev), "soltar"));
    stage.addEventListener("pointerdown", guard(ev => this.onPointerDown(ev), "mapa"));
    stage.addEventListener("pointermove", guard(ev => this.onPointerMove(ev), "mapa"));
    stage.addEventListener("pointerup", guard(ev => this.onPointerUp(ev), "mapa"));
    stage.addEventListener("pointercancel", guard(ev => this.onPointerUp(ev), "mapa"));
    stage.addEventListener("pointerleave", () => {
      this.mv.showTip(null);
      this.mv.setCursor(0, 0, null);
    });
    stage.addEventListener("dblclick", guard(ev => this.onDblClick(ev), "mapa"));
    stage.addEventListener("wheel", guard(ev => this.onWheel(ev), "zoom"), { passive: false });
    stage.addEventListener("contextmenu", ev => ev.preventDefault());
    this.boundKeyUp = ev => this.keysDown.delete(ev.code);
    window.addEventListener("keyup", this.boundKeyUp);
    this.prefsHook = Hooks.on(`${MODULE_ID}.prefs`, () => this.mv && this.applyAnimPref());
  }

  async onClick(ev) {
    const el = ev.target.closest("[data-act]");
    if ( !el || !this.shell.contains(el) ) return;
    const act = el.dataset.act;
    if ( act === "places-filter" ) return;
    const sel = this.selectedObjects();
    switch ( act ) {
      case "mode":
        this.ed.mode = el.dataset.mode;
        this.cancelDraft();
        this.renderAll();
        break;
      case "tool":
        this.setTool(el.dataset.tool);
        break;
      case "tab":
        this.ed.tab = el.dataset.tab;
        this.renderChrome();
        this.renderPanel();
        break;
      case "undo": this.undo(); break;
      case "redo": this.redo(); break;
      case "zoom-in": this.mv.zoomAt(1.3); break;
      case "zoom-out": this.mv.zoomAt(1 / 1.3); break;
      case "fit": this.mv.fit(); break;
      case "sheet": {
        const { WorldSheetApp } = await import("./world-app.mjs");
        WorldSheetApp.open();
        break;
      }
      case "show-all": emitOpen(this.mv.viewCenter()); break;
      case "focus-all":
        emitFocus(this.mv.viewCenter());
        ui.notifications.info(`${MODULE_TITLE}: a vista de todos foi trazida para cá.`);
        break;
      case "export":
        this.setSaveState("Gerando imagem...");
        await downloadPNG(this.mv, this.mapData, { asPlayer: true });
        this.setSaveState("Imagem salva");
        break;
      case "full": this.toggleFull(); break;
      case "swatch": {
        const target = el.dataset.target;
        const input = this.shell.querySelector(`[data-f="${target}"][type=color]`);
        if ( input ) input.value = el.dataset.color;
        this.applyField(target, el.dataset.color, false);
        this.renderPanel();
        break;
      }
      case "reset-field":
        this.applyField(el.dataset.target, null, false);
        this.renderPanel();
        break;
      case "pick-texture":
        this.prefs.texture.key = el.dataset.key;
        this.savePrefs();
        this.renderPanel();
        break;
      case "stamp-cat":
        this.prefs.stamp.cat = el.dataset.key;
        this.savePrefs();
        this.renderPanel();
        break;
      case "stamp-sub":
        this.prefs.stamp.sub = el.dataset.key;
        this.savePrefs();
        this.renderPanel();
        break;
      case "pick-stamp":
        this.prefs.stamp.key = el.dataset.key;
        this.prefs.stamp.size = null;
        this.savePrefs();
        this.renderPanel();
        break;
      case "pick-fx":
        this.prefs.fx.kind = el.dataset.key;
        this.prefs.fx.r = null;
        this.prefs.fx.color = null;
        this.savePrefs();
        this.renderPanel();
        break;
      case "pick-element":
        this.prefs.fx.element = el.dataset.key;
        this.savePrefs();
        this.renderPanel();
        break;
      case "pick-theme":
        this.pushHistory();
        this.mapData.style.theme = el.dataset.key;
        this.commitMap({ panel: true });
        break;
      case "gen-new":
        this.pushHistory();
        this.mapData.base.seed = 1 + Math.floor(Math.random() * 2147483646);
        this.commitMap({ panel: true });
        break;
      case "pick-image": this.pickImage(); break;
      case "lands-reset":
        this.pushHistory();
        this.mapData.lands = {};
        this.commitMap();
        break;
      case "sea-reset":
        this.pushHistory();
        this.mapData.style.sea = null;
        this.commitMap({ panel: true });
        break;
      case "paint-clear":
        if ( await this.confirm("Limpar toda a pintura do mapa?", "Carimbos, nomes e efeitos ficam. Dá para desfazer com Ctrl+Z enquanto a janela estiver aberta.") ) {
          this.pushHistory();
          this.paintData.strokes = [];
          this.paintData.image = "";
          this.mv.paint.setImage("");
          this.mv.paint.setStrokes([]);
          this.commitPaint();
          this.renderChrome();
          this.renderPanel();
        }
        break;
      case "objects-clear":
        if ( await this.confirm("Remover todos os carimbos, nomes, efeitos, rotas e regiões?", "A pintura e as cores ficam.") ) {
          this.pushHistory();
          this.mapData.objects = [];
          this.selection.clear();
          this.commitMap({ panel: true });
        }
        break;
      case "map-reset":
        if ( await this.confirm("Começar um mapa novo em folha?", "Apaga pintura, cores, carimbos, nomes, efeitos, rotas e regiões. Dá para desfazer com Ctrl+Z enquanto a janela estiver aberta.") ) {
          this.pushHistory();
          this.mapData = normalizeMap({ rev: this.mapData.rev, info: this.mapData.info });
          this.paintData.strokes = [];
          this.paintData.image = "";
          this.mv.paint.setImage("");
          this.mv.paint.setStrokes([]);
          this.selection.clear();
          this.commitPaint();
          this.commitMap({ panel: true });
        }
        break;
      case "paint-consolidate":
        if ( await this.confirm("Consolidar a pintura numa imagem?", "A pintura vira um arquivo WebP na pasta do mundo e a lista de pinceladas recomeça vazia, deixando os salvamentos leves. A borracha continua funcionando por cima. Depois disso não dá para desfazer as pinceladas antigas uma a uma.") ) {
          await this.consolidatePaint();
        }
        break;
      case "draft-finish": this.finishDraft(); break;
      case "draft-cancel": this.cancelDraft(); this.renderPanel(); break;
      case "obj-delete": this.deleteSelection(); break;
      case "obj-dup": this.duplicateSelection(); break;
      case "obj-front": this.reorderSelection(1); break;
      case "obj-back": this.reorderSelection(-1); break;
      case "obj-hide": {
        if ( !sel.length ) break;
        this.pushHistory();
        const hide = !sel.every(o => o.hidden);
        sel.forEach(o => (o.hidden = hide));
        this.commitMap({ panel: true });
        break;
      }
      case "obj-chat":
        if ( sel[0] ) await postToChat(sel[0]);
        break;
      case "obj-focusall": {
        const o = sel[0];
        if ( !o ) break;
        const [x, y] = this.objectCenter(o);
        emitFocus({ x, y, zoom: 2.2 });
        this.mv.centerOn(x, y, 2.2);
        this.mv.ping(x, y, userColor(game.user));
        break;
      }
      case "obj-openlink":
        if ( sel[0]?.link ) await this.openLink(sel[0].link);
        break;
      case "obj-unlink":
        if ( !sel[0] ) break;
        this.pushHistory();
        sel[0].link = "";
        this.commitMap({ panel: true });
        break;
      case "obj-randname": {
        const o = sel[0];
        if ( !o ) break;
        this.pushHistory();
        const kind = o.type === "stamp" ? kindForStamp(o.key) : o.type === "region" ? "reino" : o.type === "label" ? this.prefs.label.kind : "lugar";
        if ( o.type === "label" && el.dataset.field !== "name" ) o.text = generateName(kind);
        else {
          o.name = generateName(kind);
          if ( o.type === "stamp" ) o.showName = true;
        }
        this.commitMap({ panel: true });
        break;
      }
      case "place-go": {
        const o = this.objectById(el.dataset.id);
        if ( !o ) break;
        const [x, y] = this.objectCenter(o);
        this.mv.centerOn(x, y, 2.2);
        this.mv.ping(x, y, userColor(game.user));
        if ( this.editing ) {
          this.selection = new Set([o.id]);
          this.renderMap();
        }
        break;
      }
      default:
    }
  }

  /** Fields of the side panel. `live` = while typing or sliding (input), else the final change. */
  onField(ev, live) {
    const el = ev.target;
    if ( el.dataset?.act === "places-filter" ) {
      this.ed.query = el.value;
      this.filterPlaces(el.value);
      return;
    }
    const f = el.dataset?.f;
    if ( !f ) return;
    if ( el.type === "range" ) {
      const out = el.parentElement.querySelector("output");
      if ( out ) out.textContent = el.dataset.f.endsWith("opacity") || el.dataset.f.endsWith("soft") || /gen\.(land|rough|islands)|landTension/.test(f)
        ? `${Math.round(Number(el.value) * 100)}%` : (/rot$/.test(f) ? `${el.value}°` : el.value);
    }
    if ( el.type === "radio" && !el.checked ) return;
    /* text fields save on input but only re-render the panel on change */
    const structural = !live && (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio");
    this.applyField(f, readValue(el), live);
    if ( structural ) this.renderPanel();
  }

  applyField(f, value, live) {
    const [scope, path] = f.split(":");
    if ( scope === "p" ) {
      setPath(this.prefs, path, value);
      if ( path === "route.style" ) {
        this.prefs.route.color = null;
        this.prefs.route.width = null;
      }
      if ( path === "color" || path.endsWith(".color") ) this.rememberColor(value);
      this.savePrefs();
      if ( path === "stamp.tint" || path === "route.style" ) this.renderPanel();
      return;
    }
    if ( !game.user.isGM ) return;
    if ( live ) this.beginGesture();
    else if ( !this.gestureOpen ) this.pushHistory();
    if ( scope === "o" ) {
      const sel = this.selectedObjects();
      for ( const o of sel ) {
        if ( !(path in o) && !["color", "color2", "aura", "threat"].includes(path) ) continue;
        o[path] = value;
        if ( o.type === "route" && path === "style" ) {
          o.color = ROUTE_STYLES[value].color;
          o.width = ROUTE_STYLES[value].width;
          o.animated = ["maritima", "aerea", "ley", "viagem"].includes(value);
          o.arrow = value === "viagem";
        }
        if ( o.type === "fx" && path === "kind" ) {
          o.r = o.r || AREA_FX[value].r;
          o.color = null;
          o.showIcon = value === "mana";
        }
        if ( path === "color" && value ) this.rememberColor(value);
        const fixed = normalizeObject(o);
        if ( fixed ) Object.assign(o, fixed);
      }
      this.commitMap({ panel: !live && (path === "kind" || path === "style" || path === "key" || path === "hidden") });
    }
    else if ( scope === "m" ) {
      setPath(this.mapData, path, value);
      if ( path === "base.gen.shape" ) this.mapData.base.gen.land = SHAPE_LAND[value] ?? this.mapData.base.gen.land;
      const rev = this.mapData.rev;
      this.mapData = normalizeMap(this.mapData);
      this.mapData.rev = rev;
      this.commitMap({ panel: !live && (path === "base.kind" || path === "base.gen.shape") });
    }
    if ( !live ) this.endGesture();
  }

  filterPlaces(q) {
    const query = String(q ?? "").trim().toLowerCase();
    this.shell.querySelectorAll(".mf-places li").forEach(li => {
      li.hidden = !!query && !li.dataset.search.includes(query);
    });
  }

  setTool(tool) {
    if ( !TOOLS[tool] ) return;
    if ( !this.editing && tool !== "ruler" ) return;
    if ( !this.editing ) {
      this.ed.tool = this.ed.tool === "ruler" ? "select" : "ruler";
      if ( this.ed.tool !== "ruler" ) this.clearRuler();
    }
    else {
      this.cancelDraft();
      if ( tool !== "ruler" ) this.clearRuler();
      this.ed.tool = tool;
      this.ed.tab = "tool";
      if ( tool !== "select" ) this.selection.clear();
    }
    this.mv.setCursor(0, 0, null);
    this.renderMap();
    this.renderChrome();
    this.renderPanel();
  }

  toggleFull() {
    if ( this.ed.full ) {
      this.setPosition(this.ed.full);
      this.ed.full = null;
    }
    else {
      const p = this.position;
      this.ed.full = { left: p.left, top: p.top, width: p.width, height: p.height };
      this.setPosition({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
    }
  }

  async confirm(title, text) {
    try {
      return await foundry.applications.api.DialogV2.confirm({
        window: { title: MODULE_TITLE },
        content: `<p><strong>${title}</strong></p><p>${text}</p>`,
        rejectClose: false
      });
    } catch ( err ) {
      return window.confirm(`${title}\n${text}`);
    }
  }

  pickImage() {
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
    if ( !FP ) return ui.notifications.warn("Seletor de arquivos indisponível: escreva o caminho da imagem.");
    const picker = new FP({
      type: "image",
      current: this.mapData.base.image || "",
      callback: path => {
        this.pushHistory();
        this.mapData.base.image = path;
        this.commitMap({ panel: true });
      }
    });
    picker.render({ force: true });
  }

  async openLink(uuid) {
    const doc = await fromUuid(uuid);
    if ( !doc ) return ui.notifications.warn(`${MODULE_TITLE}: não encontrei o documento ligado (foi apagado?).`);
    if ( doc.testUserPermission && !doc.testUserPermission(game.user, "LIMITED") ) {
      return ui.notifications.warn(`${MODULE_TITLE}: você não tem permissão para ver isso.`);
    }
    if ( doc.documentName === "JournalEntryPage" ) return doc.parent?.sheet?.render({ force: true, pageId: doc.id });
    if ( doc.documentName === "Scene" ) return game.user.isGM ? doc.sheet?.render({ force: true }) : doc.view?.();
    return doc.sheet?.render({ force: true });
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Keyboard                                                                                         */
  /* ---------------------------------------------------------------------------------------------- */

  onKeyDown(ev) {
    const t = ev.target;
    if ( t.closest?.("input, textarea, select, [contenteditable]") ) return;
    if ( !this.mv.root.contains(t) && t !== this.shell && !this.shell.contains(t) ) return;
    const ctrl = ev.ctrlKey || ev.metaKey;
    let handled = true;
    const key = ev.key;
    if ( ev.code === "Space" ) this.keysDown.add("Space");
    else if ( ctrl && (key === "z" || key === "Z") && !ev.shiftKey ) this.undo();
    else if ( ctrl && (key === "y" || ((key === "z" || key === "Z") && ev.shiftKey)) ) this.redo();
    else if ( ctrl && (key === "d" || key === "D") ) this.duplicateSelection();
    else if ( key === "Escape" ) {
      if ( this.draft ) this.cancelDraft();
      else if ( this.ruler ) this.clearRuler();
      else if ( this.selection.size ) {
        this.selection.clear();
        this.renderMap();
        this.renderPanel();
      }
      else handled = false;
    }
    else if ( key === "Enter" && this.draft ) this.finishDraft();
    else if ( (key === "Delete" || key === "Backspace") && this.draft ) {
      this.draft.pts.pop();
      if ( !this.draft.pts.length ) this.cancelDraft();
      else this.drawDraft();
    }
    else if ( (key === "Delete" || key === "Backspace") && this.editing && this.selection.size ) this.deleteSelection();
    else if ( key.startsWith("Arrow") && this.editing && this.selection.size ) {
      const step = ev.shiftKey ? 20 : 2;
      const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
      const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
      this.beginGesture();
      for ( const o of this.selectedObjects() ) this.moveObject(o, dx, dy, null);
      this.commitMap();
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = setTimeout(() => this.endGesture(), 600);
    }
    else if ( (key === "[" || key === "]") && this.editing ) this.bumpSize(key === "]" ? 1.15 : 1 / 1.15);
    else if ( !ctrl && !ev.altKey && key.length === 1 ) {
      const tool = Object.entries(TOOLS).find(([, v]) => v.key === key.toUpperCase())?.[0];
      if ( tool && (this.editing || tool === "ruler") ) this.setTool(tool);
      else handled = false;
    }
    else handled = false;
    if ( handled ) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  bumpSize(k) {
    const tool = this.ed.tool;
    if ( tool === "select" && this.selection.size ) {
      this.beginGesture();
      for ( const o of this.selectedObjects() ) {
        if ( o.type === "stamp" || o.type === "label" ) o.size = Math.round(Math.min(600, Math.max(8, o.size * k)));
        if ( o.type === "fx" ) o.r = Math.round(Math.min(900, Math.max(15, o.r * k)));
      }
      this.commitMap({ panel: true });
      clearTimeout(this.nudgeTimer);
      this.nudgeTimer = setTimeout(() => this.endGesture(), 600);
      return;
    }
    const target = { brush: this.prefs.brush, texture: this.prefs.texture, eraser: this.prefs.eraser }[tool];
    if ( target ) {
      target.size = Math.round(Math.min(400, Math.max(2, target.size * k)));
      this.savePrefs();
      this.renderPanel();
    }
    else if ( tool === "stamp" ) {
      this.prefs.stamp.size = Math.round(Math.min(400, Math.max(16, (this.prefs.stamp.size ?? STAMPS[this.prefs.stamp.key].size) * k)));
      this.savePrefs();
      this.renderPanel();
    }
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Pointer                                                                                          */
  /* ---------------------------------------------------------------------------------------------- */

  onWheel(ev) {
    ev.preventDefault();
    const factor = Math.exp(-Math.sign(ev.deltaY) * Math.min(120, Math.abs(ev.deltaY)) * 0.0022);
    this.mv.zoomAt(factor, ev.clientX, ev.clientY);
  }

  hitObject(ev) {
    const el = ev.target.closest?.("[data-id]");
    if ( !el || !this.mv.root.contains(el) || el.dataset.handle ) return null;
    return this.objectById(el.dataset.id);
  }

  onPointerDown(ev) {
    this.mv.root.focus({ preventScroll: true });
    this.mv.showTip(null);
    const [x, y] = this.mv.toMap(ev.clientX, ev.clientY);
    const tool = this.activeTool();
    const panButton = ev.button === 1 || ev.button === 2 || this.keysDown.has("Space") || tool === "pan";
    if ( panButton ) return this.startDrag(ev, { kind: "pan", sx: ev.clientX, sy: ev.clientY });
    if ( ev.button !== 0 ) return;

    if ( tool === "view" ) {
      const o = this.hitObject(ev);
      return this.startDrag(ev, { kind: "pan", sx: ev.clientX, sy: ev.clientY, click: o, moved: false, cx: ev.clientX, cy: ev.clientY });
    }
    if ( tool === "ruler" ) return this.rulerDown(x, y, ev);
    if ( !this.editing ) return;

    switch ( tool ) {
      case "select": return this.selectDown(ev, x, y);
      case "bucket": return this.bucketClick(x, y, ev.altKey);
      case "brush":
      case "texture":
      case "eraser": return this.strokeDown(ev, x, y, tool);
      case "stamp": {
        this.pushHistory();
        this.placeStamp(x, y);
        this.commitMap();
        if ( this.prefs.stamp.scatter ) this.startDrag(ev, { kind: "scatter", last: [x, y] });
        return;
      }
      case "label": return this.placeLabel(x, y);
      case "fx": {
        this.pushHistory();
        const o = this.placeFx(x, y);
        this.commitMap();
        return this.startDrag(ev, { kind: "fxsize", id: o.id, ox: x, oy: y, moved: false });
      }
      case "route":
      case "region": return this.draftDown(ev, x, y, tool);
      default:
    }
  }

  startDrag(ev, drag) {
    this.drag = { ...drag, pointerId: ev.pointerId };
    try {
      this.mv.root.setPointerCapture(ev.pointerId);
    } catch ( err ) { /* synthetic events */ }
  }

  onPointerMove(ev) {
    const [x, y] = this.mv.toMap(ev.clientX, ev.clientY);
    this.renderStatus(x, y);
    const tool = this.activeTool();
    const d = this.drag;
    if ( !d ) {
      this.hover(ev, x, y, tool);
      return;
    }
    switch ( d.kind ) {
      case "pan":
        if ( Math.abs(ev.clientX - (d.cx ?? d.sx)) + Math.abs(ev.clientY - (d.cy ?? d.sy)) > 3 ) d.moved = true;
        this.mv.panBy(ev.clientX - d.sx, ev.clientY - d.sy);
        d.sx = ev.clientX;
        d.sy = ev.clientY;
        break;
      case "move": {
        const dx = x - d.ox, dy = y - d.oy;
        if ( !d.moved && Math.hypot(dx, dy) * this.mv.view.s < 3 ) return;
        if ( !d.moved ) this.beginGesture();
        d.moved = true;
        for ( const o of this.selectedObjects() ) this.moveObject(o, dx, dy, d.orig.get(o.id));
        this.scheduleCommit();
        break;
      }
      case "handle": return this.handleMove(d, x, y, ev);
      case "band": {
        d.x1 = x;
        d.y1 = y;
        const k = 1 / this.mv.view.s;
        this.mv.setDraft(`<rect class="d-band" x="${Math.min(d.x0, x)}" y="${Math.min(d.y0, y)}" width="${Math.abs(x - d.x0)}" height="${Math.abs(y - d.y0)}" style="stroke-width:${1.5 * k}"/>`);
        break;
      }
      case "stroke": return this.strokeMove(d, x, y);
      case "scatter": {
        const size = this.prefs.stamp.size ?? STAMPS[this.prefs.stamp.key].size;
        if ( Math.hypot(x - d.last[0], y - d.last[1]) < size * 0.55 ) return;
        const jx = (Math.random() - 0.5) * size * 0.3, jy = (Math.random() - 0.5) * size * 0.3;
        this.placeStamp(x + jx, y + jy);
        d.last = [x, y];
        this.scheduleCommit();
        break;
      }
      case "fxsize": {
        const o = this.objectById(d.id);
        const r = Math.hypot(x - d.ox, y - d.oy);
        if ( !o || r < 12 ) return;
        o.r = Math.round(Math.max(15, Math.min(900, r)));
        d.moved = true;
        this.scheduleCommit();
        break;
      }
      case "ruler":
        this.ruler.pts[this.ruler.pts.length - 1] = [x, y];
        if ( Math.hypot(x - d.x0, y - d.y0) * this.mv.view.s > 6 ) d.moved = true;
        this.drawRuler();
        break;
      case "freedraft": {
        const last = this.draft.pts[this.draft.pts.length - 1];
        if ( Math.hypot(x - last[0], y - last[1]) * this.mv.view.s > 10 ) {
          this.draft.pts.push([x, y]);
          d.moved = true;
        }
        this.draft.cursor = [x, y];
        this.drawDraft();
        break;
      }
      default:
    }
  }

  onPointerUp(ev) {
    const d = this.drag;
    this.drag = null;
    try {
      this.mv.root.releasePointerCapture(ev.pointerId);
    } catch ( err ) { /* not captured */ }
    if ( !d ) return;
    const [x, y] = this.mv.toMap(ev.clientX, ev.clientY);
    switch ( d.kind ) {
      case "pan":
        if ( d.click && !d.moved ) this.activateObject(d.click, ev);
        break;
      case "move":
        if ( d.moved ) {
          this.flushCommit();
          this.endGesture();
          this.renderPanel();
        }
        break;
      case "handle":
        if ( d.moved ) {
          this.flushCommit();
          this.endGesture();
          this.renderPanel();
        }
        break;
      case "band": {
        this.mv.setDraft("");
        const x0 = Math.min(d.x0, d.x1 ?? d.x0), x1 = Math.max(d.x0, d.x1 ?? d.x0);
        const y0 = Math.min(d.y0, d.y1 ?? d.y0), y1 = Math.max(d.y0, d.y1 ?? d.y0);
        if ( (x1 - x0) * this.mv.view.s > 4 || (y1 - y0) * this.mv.view.s > 4 ) {
          for ( const o of this.mapData.objects ) {
            const b = this.mv.bounds(o);
            if ( b.x < x1 && b.x + b.w > x0 && b.y < y1 && b.y + b.h > y0 ) this.selection.add(o.id);
          }
        }
        this.renderMap();
        this.renderPanel();
        break;
      }
      case "stroke": return this.strokeUp(d);
      case "scatter":
        this.flushCommit();
        break;
      case "fxsize":
        this.flushCommit();
        this.selection = new Set([d.id]);
        break;
      case "ruler":
        if ( d.moved ) this.ruler.done = true;
        else this.ruler.pts.push([x, y]);
        this.drawRuler();
        break;
      case "freedraft":
        if ( d.moved ) this.draft.free = true;
        break;
      default:
    }
  }

  onDblClick(ev) {
    const [x, y] = this.mv.toMap(ev.clientX, ev.clientY);
    const tool = this.activeTool();
    if ( (tool === "route" || tool === "region") && this.draft ) return this.finishDraft();
    if ( tool === "ruler" && this.ruler ) {
      this.ruler.pts.pop();
      this.ruler.done = true;
      return this.drawRuler();
    }
    if ( tool === "select" ) {
      const o = this.hitObject(ev);
      if ( o ) {
        this.ed.tab = "tool";
        this.renderChrome();
        this.renderPanel();
        const field = this.shell.querySelector(`.mmfu-pane [data-f="o:${o.type === "label" ? "text" : "name"}"]`);
        field?.focus();
        field?.select?.();
        return;
      }
    }
    if ( tool === "select" || tool === "view" || tool === "pan" ) {
      if ( this.hitObject(ev)?.link ) return;
      if ( emitPing(x, y) ) this.mv.ping(x, y, userColor(game.user), game.user.name);
      else ui.notifications.warn(`${MODULE_TITLE}: o mestre desligou os sinais dos jogadores.`);
    }
  }

  hover(ev, x, y, tool) {
    if ( tool === "select" || tool === "view" ) {
      const o = this.hitObject(ev);
      this.mv.showTip(o, ev.clientX, ev.clientY, { gm: game.user.isGM });
      this.mv.root.classList.toggle("over-link", !!o?.link && tool === "view");
    }
    const size = { brush: this.prefs.brush.size, texture: this.prefs.texture.size, eraser: this.prefs.eraser.size }[tool];
    if ( size ) this.mv.setCursor(x, y, size / 2);
    if ( tool === "bucket" ) {
      const id = this.mv.hitLand(x, y);
      const land = id ? this.mv.geo.lands.find(l => l.id === id) : null;
      if ( land !== this.hoverLand ) {
        this.hoverLand = land;
        this.mv.setDraft(land ? `<path class="d-land" d="${land.d}" fill-rule="evenodd" style="stroke-width:${3 / this.mv.view.s}"/>` : "");
      }
    }
    if ( (tool === "route" || tool === "region") && this.draft ) {
      this.draft.cursor = [x, y];
      this.drawDraft();
    }
    if ( tool === "ruler" && this.ruler && !this.ruler.done ) {
      this.ruler.cursor = [x, y];
      this.drawRuler();
    }
  }

  /** A click on a place in view mode: open its diary, or show its note. */
  activateObject(o, ev) {
    if ( o.link ) return this.openLink(o.link).catch(err => reportError(err, "abrir diário"));
    this.mv.showTip(o, ev.clientX, ev.clientY, { gm: game.user.isGM });
  }

  /* commits during drags are batched per frame */
  scheduleCommit() {
    this.mv.setMap(this.mapData, { gm: true, showHidden: this.editing, selection: this.selection });
    this.renderSel();
    if ( this.commitTimer ) return;
    this.commitTimer = setTimeout(() => {
      this.commitTimer = null;
      this.commitMap({ render: false });
    }, 120);
  }

  flushCommit() {
    clearTimeout(this.commitTimer);
    this.commitTimer = null;
    this.commitMap();
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Select tool                                                                                      */
  /* ---------------------------------------------------------------------------------------------- */

  selectDown(ev, x, y) {
    const handle = ev.target.closest?.("[data-handle]");
    if ( handle ) {
      const o = this.objectById(handle.dataset.id);
      if ( !o ) return;
      const kind = handle.dataset.handle;
      const index = Number(handle.dataset.index);
      if ( kind === "v" && ev.altKey ) {
        const pts = pairs(o.pts);
        if ( pts.length > (o.type === "region" ? 3 : 2) ) {
          this.pushHistory();
          pts.splice(index, 1);
          o.pts = flatten(pts);
          this.commitMap();
        }
        return;
      }
      if ( kind === "m" ) {
        this.pushHistory();
        this.gestureOpen = true;
        const pts = pairs(o.pts);
        pts.splice(index + 1, 0, [x, y]);
        o.pts = flatten(pts);
        this.commitMap();
        return this.startDrag(ev, { kind: "handle", handle: "v", id: o.id, index: index + 1, moved: true, orig: structuredClone(o) });
      }
      return this.startDrag(ev, { kind: "handle", handle: kind, id: o.id, index, x0: x, y0: y, moved: false, orig: structuredClone(o) });
    }
    const o = this.hitObject(ev);
    if ( o ) {
      if ( ev.shiftKey ) {
        if ( this.selection.has(o.id) ) this.selection.delete(o.id);
        else this.selection.add(o.id);
      }
      else if ( !this.selection.has(o.id) ) this.selection = new Set([o.id]);
      this.renderMap();
      this.renderPanel();
      const orig = new Map(this.selectedObjects().map(s => [s.id, structuredClone(s)]));
      return this.startDrag(ev, { kind: "move", ox: x, oy: y, orig, moved: false });
    }
    if ( !ev.shiftKey && this.selection.size ) {
      this.selection.clear();
      this.renderMap();
      this.renderPanel();
    }
    this.startDrag(ev, { kind: "band", x0: x, y0: y });
  }

  moveObject(o, dx, dy, orig) {
    const base = orig ?? o;
    if ( o.type === "route" || o.type === "region" ) {
      const src = orig ? orig.pts : o.pts;
      o.pts = src.map((v, i) => Math.round((v + (i % 2 ? dy : dx)) * 10) / 10);
    }
    else {
      o.x = Math.round((base.x + dx) * 10) / 10;
      o.y = Math.round((base.y + dy) * 10) / 10;
    }
  }

  handleMove(d, x, y, ev) {
    const o = this.objectById(d.id);
    if ( !o ) return;
    if ( !d.moved ) {
      if ( Math.hypot(x - (d.x0 ?? x), y - (d.y0 ?? y)) * this.mv.view.s < 2 ) return;
      this.beginGesture();
      d.moved = true;
    }
    const orig = d.orig;
    switch ( d.handle ) {
      case "s": {
        const r0 = Math.hypot(d.x0 - orig.x, d.y0 - orig.y) || 1;
        const k = Math.hypot(x - orig.x, y - orig.y) / r0;
        o.size = Math.round(Math.min(o.type === "label" ? 400 : 600, Math.max(8, orig.size * k)));
        break;
      }
      case "t": {
        let a = (Math.atan2(y - o.y, x - o.x) * 180) / Math.PI + 90;
        if ( a > 180 ) a -= 360;
        if ( ev.shiftKey ) a = Math.round(a / 15) * 15;
        o.rot = Math.round(a);
        break;
      }
      case "r":
        o.r = Math.round(Math.max(15, Math.min(900, Math.hypot(x - o.x, y - o.y))));
        break;
      case "v": {
        const pts = pairs(o.pts);
        if ( pts[d.index] ) pts[d.index] = [x, y];
        o.pts = flatten(pts);
        break;
      }
      default:
    }
    this.scheduleCommit();
  }

  objectCenter(o) {
    if ( o.type === "route" || o.type === "region" ) {
      const b = this.mv.bounds(o);
      return [b.x + b.w / 2, b.y + b.h / 2];
    }
    return [o.x, o.y];
  }

  deleteSelection() {
    if ( !this.selection.size ) return;
    this.pushHistory();
    this.mapData.objects = this.mapData.objects.filter(o => !this.selection.has(o.id));
    this.selection.clear();
    this.commitMap({ panel: true });
    this.renderChrome();
  }

  duplicateSelection() {
    if ( !this.editing || !this.selection.size ) return;
    this.pushHistory();
    const copies = this.selectedObjects().map(o => {
      const c = structuredClone(o);
      c.id = uid();
      this.moveObject(c, 30, 30, null);
      return c;
    });
    this.mapData.objects.push(...copies);
    this.selection = new Set(copies.map(c => c.id));
    this.commitMap({ panel: true });
    this.renderChrome();
  }

  reorderSelection(dir) {
    if ( !this.selection.size ) return;
    this.pushHistory();
    const sel = this.mapData.objects.filter(o => this.selection.has(o.id));
    const rest = this.mapData.objects.filter(o => !this.selection.has(o.id));
    this.mapData.objects = dir > 0 ? [...rest, ...sel] : [...sel, ...rest];
    this.commitMap();
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Paint tools                                                                                      */
  /* ---------------------------------------------------------------------------------------------- */

  bucketClick(x, y, pick) {
    const id = this.mv.hitLand(x, y);
    const t = themeOf(this.mapData);
    if ( pick ) {
      const c = id ? (this.mapData.lands[id] ?? t.land) : t.sea;
      this.prefs.color = c;
      this.rememberColor(c);
      this.renderPanel();
      return;
    }
    this.pushHistory();
    if ( id ) this.mapData.lands[id] = this.prefs.color;
    else this.mapData.style.sea = this.prefs.color;
    this.rememberColor(this.prefs.color);
    this.commitMap();
    this.renderChrome();
  }

  strokeDown(ev, x, y, tool) {
    const p = tool === "brush" ? this.prefs.brush : tool === "texture" ? this.prefs.texture : this.prefs.eraser;
    const stroke = {
      t: tool === "brush" ? "b" : tool === "texture" ? "x" : "e",
      c: tool === "eraser" ? "#000000" : this.prefs.color,
      w: p.size,
      o: tool === "eraser" ? 1 : p.opacity,
      s: tool === "brush" ? p.soft : 0,
      m: p.clip
    };
    if ( tool === "texture" ) stroke.x = p.key;
    this.pushHistory();
    this.startDrag(ev, { kind: "stroke", stroke, pts: [[x, y]] });
    this.mv.paint.drawLive(stroke, [[x, y]]);
  }

  strokeMove(d, x, y) {
    const last = d.pts[d.pts.length - 1];
    if ( Math.hypot(x - last[0], y - last[1]) < Math.max(1.5, d.stroke.w * 0.06) ) return;
    d.pts.push([x, y]);
    this.mv.setCursor(x, y, d.stroke.w / 2);
    this.mv.paint.drawLive(d.stroke, d.pts);
  }

  strokeUp(d) {
    const pts = d.pts.length > 2 ? simplify(d.pts, 0.6) : d.pts;
    const stroke = { ...d.stroke, p: encodePoints(pts, POINT_SCALE) };
    this.mv.paint.commit(stroke);
    this.paintData.strokes.push(stroke);
    if ( stroke.t !== "e" ) this.rememberColor(stroke.c);
    this.commitPaint();
    this.renderChrome();
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Placing things                                                                                   */
  /* ---------------------------------------------------------------------------------------------- */

  placeStamp(x, y) {
    const p = this.prefs.stamp;
    const meta = STAMPS[p.key];
    let size = p.size ?? meta.size, flip = false, rot = 0;
    if ( p.jitter ) {
      size *= 0.88 + Math.random() * 0.24;
      const flippable = meta.img ? meta.flip : FLIPPABLE.has(meta.cat);
      if ( flippable ) flip = Math.random() < 0.4;
      rot = flippable ? (Math.random() - 0.5) * 6 : 0;
    }
    const o = normalizeObject({
      type: "stamp", key: p.key, x, y, size: Math.round(size), flip, rot: Math.round(rot),
      color: p.tint && !meta.img ? p.color : null, fx: p.fx, hidden: p.hidden
    });
    this.mapData.objects.push(o);
    return o;
  }

  placeLabel(x, y) {
    const p = this.prefs.label;
    this.pushHistory();
    const o = normalizeObject({
      type: "label", x, y, text: p.text?.trim() || generateName(p.kind), font: p.font, size: p.size, color: p.color,
      outline: p.outline, outlineW: p.outlineW, fx: p.fx, fxColor: p.fxColor, caps: p.caps, bold: p.bold, italic: p.italic, hidden: p.hidden
    });
    this.mapData.objects.push(o);
    this.selection = new Set([o.id]);
    this.ed.tool = "select";
    this.commitMap({ panel: true });
    this.renderChrome();
    const field = this.shell.querySelector(`.mmfu-pane [data-f="o:text"]`);
    field?.focus();
    field?.select?.();
  }

  placeFx(x, y) {
    const p = this.prefs.fx;
    const o = normalizeObject({
      type: "fx", kind: p.kind, element: p.element, x, y, r: p.r ?? AREA_FX[p.kind].r, color: p.color, intensity: p.intensity, hidden: p.hidden
    });
    this.mapData.objects.push(o);
    return o;
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Routes and regions                                                                               */
  /* ---------------------------------------------------------------------------------------------- */

  draftDown(ev, x, y, tool) {
    if ( !this.draft || this.draft.type !== tool ) this.draft = { type: tool, pts: [[x, y]], cursor: [x, y] };
    else this.draft.pts.push([x, y]);
    this.drawDraft();
    this.renderPanel();
    this.startDrag(ev, { kind: "freedraft", moved: false });
  }

  drawDraft() {
    if ( !this.draft ) return this.mv.setDraft("");
    const k = 1 / this.mv.view.s;
    const pts = [...this.draft.pts, ...(this.draft.cursor ? [this.draft.cursor] : [])];
    const d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}${this.draft.type === "region" && pts.length > 2 ? "Z" : ""}`;
    const color = this.draft.type === "region" ? this.prefs.region.color : (this.prefs.route.color ?? ROUTE_STYLES[this.prefs.route.style].color);
    this.mv.setDraft(`<path class="d-path" d="${d}" style="stroke:${color};stroke-width:${2.5 * k};${this.draft.type === "region" ? `fill:${color};fill-opacity:0.15` : "fill:none"}"/>`
      + this.draft.pts.map(([x, y]) => `<circle class="d-pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4.5 * k).toFixed(2)}"/>`).join(""));
  }

  finishDraft() {
    const draft = this.draft;
    if ( !draft ) return;
    let pts = draft.pts.filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 3);
    if ( draft.free && pts.length > 6 ) pts = simplify(pts, 2.5);
    const need = draft.type === "region" ? 3 : 2;
    this.draft = null;
    this.mv.setDraft("");
    if ( pts.length < need ) {
      ui.notifications.warn(`${MODULE_TITLE}: ${draft.type === "region" ? "a região precisa de pelo menos 3 pontos" : "a rota precisa de pelo menos 2 pontos"}.`);
      this.renderPanel();
      return;
    }
    this.pushHistory();
    let o;
    if ( draft.type === "route" ) {
      const p = this.prefs.route;
      o = normalizeObject({
        type: "route", style: p.style, pts: flatten(pts), color: p.color ?? ROUTE_STYLES[p.style].color, width: p.width ?? ROUTE_STYLES[p.style].width,
        arrow: p.arrow || p.style === "viagem", smooth: p.smooth, hidden: p.hidden
      });
    }
    else {
      const p = this.prefs.region;
      o = normalizeObject({
        type: "region", pts: flatten(pts), color: p.color, opacity: p.opacity, pattern: p.pattern, border: p.border, threat: p.threat, hidden: p.hidden,
        name: "", showName: true
      });
    }
    if ( !o ) return;
    /* regions go under everything else so stamps stay clickable */
    if ( o.type === "region" ) this.mapData.objects.unshift(o);
    else this.mapData.objects.push(o);
    this.selection = new Set([o.id]);
    this.ed.tool = "select";
    this.commitMap({ panel: true });
    this.renderChrome();
    this.shell.querySelector(`.mmfu-pane [data-f="o:name"]`)?.focus();
  }

  cancelDraft() {
    if ( !this.draft ) return;
    this.draft = null;
    this.mv?.setDraft("");
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Ruler                                                                                            */
  /* ---------------------------------------------------------------------------------------------- */

  rulerDown(x, y, ev) {
    if ( !this.ruler || this.ruler.done ) this.ruler = { pts: [[x, y], [x, y]], done: false };
    else {
      this.ruler.pts[this.ruler.pts.length - 1] = [x, y];
      this.ruler.pts.push([x, y]);
    }
    this.startDrag(ev, { kind: "ruler", x0: x, y0: y, moved: false });
    this.drawRuler();
  }

  drawRuler() {
    const r = this.ruler;
    if ( !r ) return this.mv.setRuler(null);
    const pts = r.done || !r.cursor ? r.pts : [...r.pts.slice(0, -1), r.cursor];
    const len = polylineLength(pts);
    const day = CELL * this.mapData.style.dayCells;
    const lines = [`${formatDays(len / day)} de viagem`, `${(Math.round((len / CELL) * 10) / 10).toLocaleString("pt-BR")} quadrados`];
    const threat = this.threatAlong(pts);
    if ( threat ) lines.push(`Maior ameaça: ${THREATS[threat].label} (d${THREATS[threat].die})`);
    this.mv.setRuler(pts, lines.join("\n"));
  }

  threatAlong(pts) {
    const regions = this.mapData.objects.filter(o => o.type === "region" && o.threat && (this.editing || !o.hidden));
    if ( !regions.length || pts.length < 1 ) return null;
    const polys = regions.map(o => ({ t: o.threat, p: pairs(o.pts) }));
    let best = -1;
    for ( const [x, y] of samplePolyline(pts, 16) ) {
      for ( const r of polys ) {
        const i = THREAT_KEYS.indexOf(r.t);
        if ( i > best && pointInPolygon(x, y, r.p) ) best = i;
      }
    }
    return best >= 0 ? THREAT_KEYS[best] : null;
  }

  clearRuler() {
    this.ruler = null;
    this.mv?.setRuler(null);
  }

  /* ---------------------------------------------------------------------------------------------- */
  /* Drop documents on the map or on the link field                                                  */
  /* ---------------------------------------------------------------------------------------------- */

  async onDrop(ev) {
    if ( !this.editing ) return;
    const data = dragData(ev);
    const uuid = data?.uuid ?? (data?.type && data?.id ? `${data.type}.${data.id}` : null);
    if ( !uuid ) return;
    ev.preventDefault();
    let doc = null;
    try {
      doc = await fromUuid(uuid);
    } catch ( err ) {
      doc = null;
    }
    const name = doc?.name ?? "";
    const linkBox = ev.target.closest?.("[data-drop=link]");
    if ( linkBox ) {
      const o = this.selectedObjects()[0];
      if ( !o ) return;
      this.pushHistory();
      o.link = uuid;
      if ( !o.name && name ) o.name = name;
      this.commitMap({ panel: true });
      return;
    }
    if ( !this.mv.root.contains(ev.target) ) return;
    const [x, y] = this.mv.toMap(ev.clientX, ev.clientY);
    this.pushHistory();
    const key = doc?.documentName === "Actor" ? "exclamacao" : doc?.documentName === "Scene" ? "bandeira" : doc?.documentName === "Item" ? "bau" : "alfinete";
    const o = normalizeObject({ type: "stamp", key, x, y, name, link: uuid, showName: !!name, size: STAMPS[key].size });
    this.mapData.objects.push(o);
    this.selection = new Set([o.id]);
    this.ed.tool = "select";
    this.ed.tab = "tool";
    this.commitMap({ panel: true });
    this.renderChrome();
  }
}
