/**
 * Mapa-mundi-FU: post a place of the map to the chat (public message, readable by everyone).
 */
import { MODULE_TITLE, escapeHTML } from "./constants.mjs";
import { AREA_FX, ELEMENTS, ROUTE_STYLES, STAMPS, THREATS } from "./catalog.mjs";

export async function postToChat(o) {
  const title = o.type === "label" ? o.text : (o.name || (o.type === "stamp" ? STAMPS[o.key]?.label : ""));
  let kind = "";
  if ( o.type === "stamp" ) kind = STAMPS[o.key]?.label ?? "";
  else if ( o.type === "route" ) kind = ROUTE_STYLES[o.style]?.label ?? "";
  else if ( o.type === "region" ) kind = "Região";
  else if ( o.type === "fx" ) kind = o.kind === "mana" ? "Mana latente" : (AREA_FX[o.kind]?.label ?? "");
  const mana = o.type === "fx" && o.kind === "mana" ? ELEMENTS[o.element] : (o.type === "stamp" && o.aura ? ELEMENTS[o.aura] : null);
  const manaLine = mana
    ? `<p class="mmfu-chat-mana" style="--fxc:${mana.color}"><i class="${mana.icon}"></i> Mana latente de ${escapeHTML(mana.label.toLowerCase())}</p>` : "";
  const threat = o.type === "region" && o.threat
    ? `<p class="mmfu-chat-threat"><i class="fa-solid fa-dice-d20"></i> Ameaça: ${escapeHTML(THREATS[o.threat].label)} (d${THREATS[o.threat].die})</p>` : "";
  const note = o.note ? `<p>${escapeHTML(o.note).replace(/\n/g, "<br>")}</p>` : "";
  const link = o.link ? `<p>@UUID[${escapeHTML(o.link)}]</p>` : "";
  const content = `<div class="mmfu-chat"><h3><i class="fa-solid fa-map-location-dot"></i> ${escapeHTML(title || kind || "Lugar")}</h3>`
    + `${kind && title !== kind ? `<p class="mmfu-chat-kind">${escapeHTML(kind)}</p>` : ""}${threat}${manaLine}${note}${link}</div>`;
  const ChatClass = ChatMessage.implementation ?? ChatMessage;
  return ChatClass.create({ content, speaker: ChatClass.getSpeaker({ alias: MODULE_TITLE }) });
}
