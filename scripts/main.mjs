/**
 * Mapa-mundi-FU: entry point.
 *
 * Opening the map (everybody): the "Mapa-múndi" button in the Token controls, the button at the top of the
 * Journal sidebar, a keybinding (unassigned by default) or `game.modules.get("mapa-mundi-fu").api.open()`.
 * Only the GM edits; players look, measure and signal.
 */
import { MODULE_ID, MODULE_TITLE } from "./constants.mjs";
import { getMap, getPaint, getSheet, registerSettings } from "./store.mjs";
import { MapApp } from "./map-app.mjs";
import { WorldSheetApp } from "./world-app.mjs";
import { emitOpen, listenSocket } from "./broadcast.mjs";
import { reportError, watchUncaught } from "./errors.mjs";

Hooks.once("init", () => {
  watchUncaught();
  registerSettings();
  game.keybindings.register(MODULE_ID, "abrir", {
    name: `Abrir o ${MODULE_TITLE}`,
    editable: [],
    restricted: false,
    onDown: () => {
      MapApp.open();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  listenSocket({
    open: point => MapApp.open(point),
    focus: point => MapApp.focus(point),
    ping: (point, user) => MapApp.ping(point, user)
  });
  const module = game.modules.get(MODULE_ID);
  if ( module ) {
    module.api = {
      /** Open the map on this screen, optionally looking at { x, y, zoom } (map units, zoom 1 = whole map). */
      open: (point = null) => MapApp.open(point),
      /** GM: open the map on every screen. */
      showAll: (point = null) => emitOpen(point),
      /** Open the World Sheet. */
      sheet: () => WorldSheetApp.open(),
      /** Copies of the stored data. */
      map: () => getMap(),
      paint: () => getPaint(),
      worldSheet: () => getSheet()
    };
  }
});

function onSettingChanged(setting) {
  const key = String(setting?.key ?? "");
  if ( !key.startsWith(`${MODULE_ID}.`) ) return;
  const name = key.slice(MODULE_ID.length + 1);
  try {
    if ( name === "mapa" || name === "pintura" ) MapApp.onSetting(name);
    if ( name === "ficha" ) WorldSheetApp.refresh();
    if ( name === "mapa" ) WorldSheetApp.refresh();
  } catch ( err ) {
    reportError(err, "sincronizar");
  }
}
Hooks.on("createSetting", onSettingChanged);
Hooks.on("updateSetting", onSettingChanged);

/* v13+: controls is a record of controls, each with a record of tools. Visible to everybody. */
Hooks.on("getSceneControlButtons", controls => {
  const tokens = controls?.tokens;
  if ( !tokens?.tools ) return;
  tokens.tools.mapaMundiFU = {
    name: "mapaMundiFU",
    title: MODULE_TITLE,
    icon: "fa-solid fa-map-location-dot",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => MapApp.open()
  };
});

/* A button at the top of the Journal sidebar, where players look for maps. */
Hooks.on("renderJournalDirectory", (app, html) => {
  try {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if ( !root || root.querySelector(".mmfu-open-journal") ) return;
    const bar = root.querySelector(".header-actions") ?? root.querySelector(".directory-header");
    if ( !bar ) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mmfu-open-journal";
    btn.innerHTML = `<i class="fa-solid fa-map-location-dot"></i> ${MODULE_TITLE}`;
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      MapApp.open();
    });
    bar.append(btn);
  } catch ( err ) {
    reportError(err, "barra do diário");
  }
});
