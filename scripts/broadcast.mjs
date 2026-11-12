/**
 * Mapa-mundi-FU: messages between screens on `module.mapa-mundi-fu` (nothing here writes to the world).
 *   { type: "open",  from, x, y, zoom }   GM: open the map on every screen (optionally at a place)
 *   { type: "focus", from, x, y, zoom }   GM: move every open map to this view
 *   { type: "ping",  from, x, y }         anyone (if allowed): a signal on the map for everyone
 */
import { MODULE_ID, MODULE_TITLE, SOCKET } from "./constants.mjs";
import { reportError } from "./errors.mjs";
import { setting } from "./store.mjs";

let handlers = { open: () => null, focus: () => null, ping: () => null };

export function userColor(user) {
  const c = user?.color;
  if ( !c ) return "#ffd34d";
  return typeof c === "string" ? c : (c.css ?? String(c));
}

export function emitOpen(point = null) {
  if ( !game.user.isGM ) return;
  game.socket.emit(SOCKET, { type: "open", from: game.user.id, ...(point ?? {}) });
  ui.notifications.info(`${MODULE_TITLE}: aberto para todos os jogadores.`);
}

export function emitFocus(point) {
  if ( !game.user.isGM ) return;
  game.socket.emit(SOCKET, { type: "focus", from: game.user.id, ...point });
}

export function emitPing(x, y) {
  if ( !game.user.isGM && !setting("pingJogadores", true) ) return false;
  game.socket.emit(SOCKET, { type: "ping", from: game.user.id, x, y });
  return true;
}

export function listenSocket(h) {
  handlers = { ...handlers, ...h };
  game.socket.on(SOCKET, data => {
    try {
      const from = game.users.get(data?.from);
      if ( !from ) return;
      const point = Number.isFinite(data.x) && Number.isFinite(data.y)
        ? { x: data.x, y: data.y, zoom: Number.isFinite(data.zoom) ? data.zoom : null } : null;
      if ( data.type === "open" && from.isGM ) handlers.open(point);
      else if ( data.type === "focus" && from.isGM && point ) handlers.focus(point);
      else if ( data.type === "ping" && point && (from.isGM || setting("pingJogadores", true)) ) handlers.ping(point, from);
    } catch ( err ) {
      reportError(err, "socket");
    }
  });
}

export const MODULE = MODULE_ID;
