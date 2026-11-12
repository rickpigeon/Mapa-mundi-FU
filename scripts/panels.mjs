/**
 * Mapa-mundi-FU: HTML of the side panel (tool options, inspector, map settings, places list).
 * Fields carry data-f="scope:path": p = tool preferences, o = selected objects, m = the map.
 * data-type: num | bool | str | nstr (empty = null) | color | ncolor (empty = null).
 */
import { CELL, escapeHTML } from "./constants.mjs";
import {
  AREA_FX, DECOR, ELEMENTS, LABEL_FX, PALETTE, REGION_BORDERS, REGION_PATTERNS, ROUTE_STYLES, STAMPS, STAMP_CATEGORIES, STAMP_FX,
  TEXTURES, THEMES, THREATS, fontChoices
} from "./catalog.mjs";
import { SHAPES } from "./generator.mjs";
import { BASES } from "./store.mjs";
import { texturePreview } from "./paint.mjs";
import { NAME_KINDS } from "./names.mjs";

const h = escapeHTML;
const pct = v => `${Math.round(v * 100)}%`;

export const TOOLS = {
  select: { label: "Selecionar e mover", icon: "fa-solid fa-arrow-pointer", key: "V" },
  pan: { label: "Mover a vista", icon: "fa-solid fa-hand", key: "H" },
  bucket: { label: "Balde: colorir terras e mar", icon: "fa-solid fa-fill-drip", key: "B" },
  brush: { label: "Pincel", icon: "fa-solid fa-paintbrush", key: "P" },
  texture: { label: "Pincel de textura", icon: "fa-solid fa-tree", key: "T" },
  eraser: { label: "Borracha", icon: "fa-solid fa-eraser", key: "E" },
  stamp: { label: "Carimbos (montanhas, árvores, monstros...)", icon: "fa-solid fa-stamp", key: "S" },
  label: { label: "Nomes", icon: "fa-solid fa-font", key: "N" },
  fx: { label: "Efeitos e mana latente", icon: "fa-solid fa-wand-magic-sparkles", key: "F" },
  route: { label: "Rotas, rios e fronteiras", icon: "fa-solid fa-route", key: "R" },
  region: { label: "Regiões e reinos", icon: "fa-solid fa-draw-polygon", key: "G" },
  ruler: { label: "Medir dias de viagem", icon: "fa-solid fa-ruler", key: "M" }
};

export const HINTS = {
  select: "Clique para selecionar, arraste para mover. Shift soma à seleção. Arraste no vazio para selecionar vários. Del apaga, Ctrl+D duplica.",
  pan: "Arraste para mover a vista. A roda do mouse aproxima.",
  bucket: "Clique numa terra para pintá-la com a cor escolhida; clique no mar para mudar a cor do mar. Alt+clique copia a cor.",
  brush: "Arraste para pintar. [ e ] mudam o tamanho.",
  texture: "Arraste para pintar a textura por cima das cores.",
  eraser: "Arraste para apagar a pintura (carimbos e nomes não são apagados).",
  stamp: "Clique para pôr o carimbo. Com \"espalhar\" ligado, arraste para semear vários.",
  label: "Clique onde o nome deve ficar.",
  fx: "Clique para pôr o efeito; arraste para escolher o tamanho.",
  route: "Clique para cada ponto (ou arraste à mão livre). Duplo clique ou Enter termina, Backspace desfaz o ponto, Esc cancela.",
  region: "Clique para cada ponto da região. Duplo clique ou Enter fecha, Esc cancela.",
  ruler: "Arraste para medir, ou clique ponto a ponto e termine com duplo clique. Esc limpa.",
  view: "Arraste para mover, roda para aproximar. Passe o mouse nos lugares; duplo clique faz um sinal para todos."
};

/* ---------------------------------------------------------------------------------------------- */
/* Field helpers                                                                                    */
/* ---------------------------------------------------------------------------------------------- */

export function range(label, f, value, min, max, step = 1, fmt = v => v) {
  return `<label class="mf-row mf-range"><span>${h(label)}</span><input type="range" data-f="${f}" data-type="num" min="${min}" max="${max}" step="${step}" value="${value}">`
    + `<output>${h(fmt(value))}</output></label>`;
}

export function number(label, f, value, min, max, step = 1) {
  return `<label class="mf-row"><span>${h(label)}</span><input type="number" data-f="${f}" data-type="num" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}

export function check(label, f, value, hint = "") {
  return `<label class="mf-check"${hint ? ` data-tooltip="${h(hint)}"` : ""}><input type="checkbox" data-f="${f}" data-type="bool"${value ? " checked" : ""}><span>${h(label)}</span></label>`;
}

export function text(label, f, value, { placeholder = "", area = false, rows = 3, act = "" } = {}) {
  const input = area
    ? `<textarea data-f="${f}" data-type="str" rows="${rows}" placeholder="${h(placeholder)}">${h(value)}</textarea>`
    : `<input type="text" data-f="${f}" data-type="str" value="${h(value)}" placeholder="${h(placeholder)}">`;
  return `<label class="mf-row mf-text${area ? " mf-area" : ""}"><span>${h(label)}</span>${input}${act}</label>`;
}

export function colorField(label, f, value, { nullable = false, fallback = "#000000" } = {}) {
  const v = value ?? fallback;
  return `<label class="mf-row mf-color"><span>${h(label)}</span><input type="color" data-f="${f}" data-type="${nullable ? "ncolor" : "color"}" value="${h(v)}">`
    + (nullable ? `<button type="button" class="mf-mini${value ? "" : " is-off"}" data-act="reset-field" data-target="${f}" data-tooltip="Voltar à cor padrão"><i class="fa-solid fa-rotate-left"></i></button>` : "")
    + `</label>`;
}

export function select(label, f, value, options, { type = "str" } = {}) {
  const opts = Object.entries(options).map(([k, v]) => `<option value="${h(k)}"${String(k) === String(value ?? "") ? " selected" : ""}>${h(v)}</option>`).join("");
  return `<label class="mf-row"><span>${h(label)}</span><select data-f="${f}" data-type="${type}">${opts}</select></label>`;
}

function section(title, body, { open = true, cls = "" } = {}) {
  return `<details class="mf-sec ${cls}"${open ? " open" : ""}><summary>${h(title)}</summary><div class="mf-sec-body">${body}</div></details>`;
}

/** Colour palette: clicking a swatch sets `f`. */
export function palette(f, current, recent = []) {
  const sw = ([name, c]) => `<button type="button" class="mf-sw${c === current ? " is-on" : ""}" style="--sw:${c}" data-act="swatch" data-target="${f}" data-color="${c}" data-tooltip="${h(name)}"></button>`;
  const rec = recent.length ? `<div class="mf-recent"><span>Recentes</span>${recent.map(c => sw(["Recente", c])).join("")}</div>` : "";
  return `<div class="mf-palette">${PALETTE.map(sw).join("")}</div>${rec}`
    + `<label class="mf-row mf-color"><span>Cor</span><input type="color" data-f="${f}" data-type="color" value="${h(current)}"></label>`;
}

const clipField = (f, value) => select("Onde pinta", f, value, { a: "Em todo lugar", l: "Só na terra", s: "Só no mar" });

/* ---------------------------------------------------------------------------------------------- */
/* Tool panels                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

export function toolPanel(app) {
  const p = app.prefs;
  const tool = app.ed.tool;
  const title = `<div class="mf-tooltitle"><i class="${TOOLS[tool].icon}"></i> ${h(TOOLS[tool].label)}</div><p class="mf-hint">${h(HINTS[tool])}</p>`;
  switch ( tool ) {
    case "bucket":
      return title + palette("p:color", p.color, p.recent)
        + `<div class="mf-actions"><button type="button" data-act="lands-reset"><i class="fa-solid fa-rotate-left"></i> Cores originais das terras</button>`
        + `<button type="button" data-act="sea-reset"><i class="fa-solid fa-water"></i> Cor original do mar</button></div>`;
    case "brush":
      return title + palette("p:color", p.color, p.recent)
        + range("Tamanho", "p:brush.size", p.brush.size, 2, 300, 1)
        + range("Opacidade", "p:brush.opacity", p.brush.opacity, 0.05, 1, 0.05, pct)
        + range("Suavidade", "p:brush.soft", p.brush.soft, 0, 1, 0.05, pct)
        + clipField("p:brush.clip", p.brush.clip)
        + `<div class="mf-actions"><button type="button" class="mf-danger" data-act="paint-clear"><i class="fa-solid fa-trash"></i> Limpar toda a pintura</button></div>`;
    case "texture": {
      const tex = Object.entries(TEXTURES).map(([k, label]) => `<button type="button" class="mf-tex${k === p.texture.key ? " is-on" : ""}" data-act="pick-texture" data-key="${k}" data-tooltip="${h(label)}" style="background-image:url(${texturePreview(k, p.color)})"></button>`).join("");
      return title + `<div class="mf-texgrid">${tex}</div>` + palette("p:color", p.color, p.recent)
        + range("Tamanho", "p:texture.size", p.texture.size, 10, 400, 1)
        + range("Opacidade", "p:texture.opacity", p.texture.opacity, 0.05, 1, 0.05, pct)
        + clipField("p:texture.clip", p.texture.clip);
    }
    case "eraser":
      return title + range("Tamanho", "p:eraser.size", p.eraser.size, 4, 400, 1) + clipField("p:eraser.clip", p.eraser.clip)
        + `<div class="mf-actions"><button type="button" class="mf-danger" data-act="paint-clear"><i class="fa-solid fa-trash"></i> Limpar toda a pintura</button></div>`;
    case "stamp": {
      const cats = Object.entries(STAMP_CATEGORIES).map(([k, label]) => `<button type="button" class="mf-cat${k === p.stamp.cat ? " is-on" : ""}" data-act="stamp-cat" data-key="${k}">${h(label)}</button>`).join("");
      const meta = STAMPS[p.stamp.key];
      const list = Object.entries(STAMPS).filter(([, m]) => m.cat === p.stamp.cat).map(([k, m]) => (
        `<button type="button" class="mf-stamp${k === p.stamp.key ? " is-on" : ""}" data-act="pick-stamp" data-key="${k}" data-tooltip="${h(m.label)}">`
        + `<svg viewBox="0 0 100 100" overflow="visible" style="--c1:${p.stamp.tint ? p.stamp.color : m.c1};--c2:${m.c2}"><use href="#mmfu-st-${k}"/></svg></button>`
      )).join("");
      return title + `<div class="mf-cats">${cats}</div><div class="mf-stampgrid">${list}</div>`
        + range("Tamanho", "p:stamp.size", p.stamp.size ?? meta.size, 16, 400, 1)
        + check("Cor própria", "p:stamp.tint", p.stamp.tint)
        + (p.stamp.tint ? colorField("Cor", "p:stamp.color", p.stamp.color) : "")
        + check("Espalhar ao arrastar", "p:stamp.scatter", p.stamp.scatter, "Arraste para semear vários (florestas, cordilheiras...)")
        + check("Variação aleatória", "p:stamp.jitter", p.stamp.jitter, "Muda um pouco o tamanho e espelha alguns, para não ficarem iguais")
        + select("Animação", "p:stamp.fx", p.stamp.fx, STAMP_FX)
        + check("Colocar escondido dos jogadores", "p:stamp.hidden", p.stamp.hidden);
    }
    case "label":
      return title + text("Texto", "p:label.text", p.label.text, { placeholder: "Vazio = nome sorteado" })
        + select("Gerar nome de", "p:label.kind", p.label.kind, NAME_KINDS)
        + fontSelect("p:label.font", p.label.font)
        + range("Tamanho", "p:label.size", p.label.size, 10, 220, 1)
        + colorField("Cor", "p:label.color", p.label.color)
        + colorField("Contorno", "p:label.outline", p.label.outline)
        + range("Espessura do contorno", "p:label.outlineW", p.label.outlineW, 0, 10, 0.5)
        + select("Efeito", "p:label.fx", p.label.fx, LABEL_FX)
        + colorField("Cor do efeito", "p:label.fxColor", p.label.fxColor)
        + check("Maiúsculas", "p:label.caps", p.label.caps) + check("Negrito", "p:label.bold", p.label.bold) + check("Itálico", "p:label.italic", p.label.italic)
        + check("Colocar escondido dos jogadores", "p:label.hidden", p.label.hidden);
    case "fx": {
      const kinds = Object.entries(AREA_FX).map(([k, m]) => `<button type="button" class="mf-fxk${k === p.fx.kind ? " is-on" : ""}" data-act="pick-fx" data-key="${k}"><i class="${m.icon}"></i><span>${h(m.label)}</span></button>`).join("");
      const elements = Object.entries(ELEMENTS).map(([k, m]) => `<button type="button" class="mf-el${k === p.fx.element ? " is-on" : ""}" style="--fxc:${m.color}" data-act="pick-element" data-key="${k}" data-tooltip="${h(m.label)}"><i class="${m.icon}"></i></button>`).join("");
      return title + `<div class="mf-fxgrid">${kinds}</div>`
        + (p.fx.kind === "mana" ? `<div class="mf-sub">Elemento</div><div class="mf-elements">${elements}</div>` : colorField("Cor", "p:fx.color", p.fx.color ?? AREA_FX[p.fx.kind].color))
        + range("Raio", "p:fx.r", p.fx.r ?? AREA_FX[p.fx.kind].r, 20, 600, 5)
        + range("Intensidade", "p:fx.intensity", p.fx.intensity, 1, 3, 1)
        + check("Colocar escondido dos jogadores", "p:fx.hidden", p.fx.hidden, "Como a mana latente que só o mestre vê");
    }
    case "route":
      return title + select("Tipo", "p:route.style", p.route.style, Object.fromEntries(Object.entries(ROUTE_STYLES).map(([k, m]) => [k, m.label])))
        + colorField("Cor", "p:route.color", p.route.color ?? ROUTE_STYLES[p.route.style].color)
        + range("Espessura", "p:route.width", p.route.width ?? ROUTE_STYLES[p.route.style].width, 1, 40, 1)
        + check("Seta no fim", "p:route.arrow", p.route.arrow) + check("Curvas suaves", "p:route.smooth", p.route.smooth)
        + check("Colocar escondida dos jogadores", "p:route.hidden", p.route.hidden)
        + (app.draft ? `<div class="mf-actions"><button type="button" data-act="draft-finish"><i class="fa-solid fa-check"></i> Terminar</button><button type="button" data-act="draft-cancel"><i class="fa-solid fa-xmark"></i> Cancelar</button></div>` : "");
    case "region":
      return title + palette("p:region.color", p.region.color, p.recent)
        + range("Opacidade do preenchimento", "p:region.opacity", p.region.opacity, 0, 1, 0.05, pct)
        + select("Preenchimento", "p:region.pattern", p.region.pattern, REGION_PATTERNS)
        + select("Borda", "p:region.border", p.region.border, REGION_BORDERS)
        + select("Ameaça de viagem", "p:region.threat", p.region.threat ?? "", threatOptions(), { type: "nstr" })
        + check("Colocar escondida dos jogadores", "p:region.hidden", p.region.hidden)
        + (app.draft ? `<div class="mf-actions"><button type="button" data-act="draft-finish"><i class="fa-solid fa-check"></i> Fechar região</button><button type="button" data-act="draft-cancel"><i class="fa-solid fa-xmark"></i> Cancelar</button></div>` : "");
    case "ruler":
      return title + `<p class="mf-hint">No mapa, 1 dia de viagem = ${h(String(app.mapData.style.dayCells).replace(".", ","))} quadrado(s) da grade (${Math.round(CELL * app.mapData.style.dayCells)} unidades). O mestre muda isso em Mapa &gt; Viagem.</p>`
        + `<p class="mf-hint">A régua mostra a maior ameaça das regiões que cruza (Livro Básico p. 106: Mínimo d6, Baixo d8, Médio d10, Alto d12, Muito alto d20).</p>`;
    case "pan":
      return title;
    default:
      return title + `<p class="mf-hint">Nada selecionado.</p>`;
  }
}

export function threatOptions() {
  return { "": "Nenhuma", ...Object.fromEntries(Object.entries(THREATS).map(([k, t]) => [k, `${t.label} (d${t.die})`])) };
}

function fontSelect(f, value) {
  const fonts = fontChoices();
  if ( value && !fonts.includes(value) ) fonts.unshift(value);
  return select("Fonte", f, value, Object.fromEntries(fonts.map(x => [x, x])));
}

/* ---------------------------------------------------------------------------------------------- */
/* Inspector                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function inspector(app, objs) {
  if ( objs.length > 1 ) {
    const hidden = objs.every(o => o.hidden);
    return `<div class="mf-tooltitle"><i class="fa-solid fa-layer-group"></i> ${objs.length} selecionados</div>`
      + `<div class="mf-actions mf-wrap">`
      + `<button type="button" data-act="obj-hide"><i class="fa-solid ${hidden ? "fa-eye" : "fa-eye-slash"}"></i> ${hidden ? "Revelar" : "Esconder"}</button>`
      + `<button type="button" data-act="obj-dup"><i class="fa-solid fa-clone"></i> Duplicar</button>`
      + `<button type="button" data-act="obj-front"><i class="fa-solid fa-arrow-up"></i> Frente</button>`
      + `<button type="button" data-act="obj-back"><i class="fa-solid fa-arrow-down"></i> Trás</button>`
      + `<button type="button" class="mf-danger" data-act="obj-delete"><i class="fa-solid fa-trash"></i> Excluir</button></div>`;
  }
  const o = objs[0];
  let head = "", body = "";
  switch ( o.type ) {
    case "stamp": {
      const meta = STAMPS[o.key];
      const opts = {};
      for ( const [cat, label] of Object.entries(STAMP_CATEGORIES) ) {
        for ( const [k, m] of Object.entries(STAMPS) ) if ( m.cat === cat ) opts[k] = `${label}: ${m.label}`;
      }
      head = `<i class="fa-solid fa-stamp"></i> ${h(meta.label)}`;
      body = select("Carimbo", "o:key", o.key, opts)
        + range("Tamanho", "o:size", o.size, 12, 600, 1) + range("Giro", "o:rot", o.rot, -180, 180, 1, v => `${v}°`)
        + check("Espelhar", "o:flip", o.flip)
        + colorField("Cor principal", "o:color", o.color, { nullable: true, fallback: meta.c1 })
        + colorField("Cor secundária", "o:color2", o.color2, { nullable: true, fallback: meta.c2 })
        + range("Opacidade", "o:opacity", o.opacity, 0.1, 1, 0.05, pct)
        + select("Animação", "o:fx", o.fx, STAMP_FX)
        + select("Aura de mana", "o:aura", o.aura ?? "", { "": "Nenhuma", ...Object.fromEntries(Object.entries(ELEMENTS).map(([k, m]) => [k, m.label])) }, { type: "nstr" })
        + check("Mostrar o nome embaixo", "o:showName", o.showName);
      break;
    }
    case "label":
      head = `<i class="fa-solid fa-font"></i> Nome`;
      body = text("Texto", "o:text", o.text, { act: `<button type="button" class="mf-mini" data-act="obj-randname" data-tooltip="Sortear um nome"><i class="fa-solid fa-dice"></i></button>` })
        + fontSelect("o:font", o.font)
        + range("Tamanho", "o:size", o.size, 8, 400, 1)
        + colorField("Cor", "o:color", o.color) + colorField("Contorno", "o:outline", o.outline)
        + range("Espessura do contorno", "o:outlineW", o.outlineW, 0, 12, 0.5)
        + range("Curva", "o:curve", o.curve, -100, 100, 1) + range("Giro", "o:rot", o.rot, -180, 180, 1, v => `${v}°`)
        + range("Espaço entre letras", "o:spacing", o.spacing, -0.1, 1.5, 0.01)
        + check("Maiúsculas", "o:caps", o.caps) + check("Negrito", "o:bold", o.bold) + check("Itálico", "o:italic", o.italic)
        + select("Efeito", "o:fx", o.fx, LABEL_FX) + colorField("Cor do efeito", "o:fxColor", o.fxColor)
        + range("Opacidade", "o:opacity", o.opacity, 0.1, 1, 0.05, pct);
      break;
    case "fx":
      head = `<i class="${AREA_FX[o.kind].icon}"></i> ${h(AREA_FX[o.kind].label)}`;
      body = select("Efeito", "o:kind", o.kind, Object.fromEntries(Object.entries(AREA_FX).map(([k, m]) => [k, m.label])))
        + (o.kind === "mana" ? select("Elemento", "o:element", o.element, Object.fromEntries(Object.entries(ELEMENTS).map(([k, m]) => [k, m.label])))
          : colorField("Cor", "o:color", o.color, { nullable: true, fallback: AREA_FX[o.kind].color }))
        + range("Raio", "o:r", o.r, 15, 900, 1) + range("Intensidade", "o:intensity", o.intensity, 1, 3, 1)
        + check("Mostrar ícone", "o:showIcon", o.showIcon);
      break;
    case "route":
      head = `<i class="fa-solid fa-route"></i> ${h(ROUTE_STYLES[o.style].label)}`;
      body = select("Tipo", "o:style", o.style, Object.fromEntries(Object.entries(ROUTE_STYLES).map(([k, m]) => [k, m.label])))
        + colorField("Cor", "o:color", o.color) + range("Espessura", "o:width", o.width, 1, 60, 1)
        + check("Curvas suaves", "o:smooth", o.smooth) + check("Seta no fim", "o:arrow", o.arrow) + check("Animada", "o:animated", o.animated)
        + check("Mostrar o nome ao longo da rota", "o:showName", o.showName)
        + `<p class="mf-hint">Arraste os quadradinhos para mudar o traçado; os círculos do meio criam pontos novos; Alt+clique num ponto o apaga.</p>`;
      break;
    case "region":
      head = `<i class="fa-solid fa-draw-polygon"></i> Região`;
      body = palette("o:color", o.color, app.prefs.recent)
        + range("Opacidade do preenchimento", "o:opacity", o.opacity, 0, 1, 0.05, pct)
        + select("Preenchimento", "o:pattern", o.pattern, REGION_PATTERNS) + select("Borda", "o:border", o.border, REGION_BORDERS)
        + range("Espessura da borda", "o:borderW", o.borderW, 0, 30, 1) + check("Curvas suaves", "o:smooth", o.smooth)
        + select("Ameaça de viagem", "o:threat", o.threat ?? "", threatOptions(), { type: "nstr" })
        + check("Mostrar o nome no centro", "o:showName", o.showName);
      break;
    default:
  }
  const common = section("Nome, notas e diário",
    text(o.type === "label" ? "Nome para a lista de lugares" : "Nome", "o:name", o.name, {
      placeholder: o.type === "label" ? "Opcional" : "",
      act: o.type === "label" ? "" : `<button type="button" class="mf-mini" data-act="obj-randname" data-field="name" data-tooltip="Sortear um nome"><i class="fa-solid fa-dice"></i></button>`
    })
    + text("Nota (todos veem)", "o:note", o.note, { area: true })
    + text("Nota do mestre", "o:gmNote", o.gmNote, { area: true, placeholder: "Só o mestre vê" })
    + `<div class="mf-row mf-link" data-drop="link"><span>Diário ligado</span><div class="mf-linkbox">${o.link ? `<code>${h(o.link)}</code>` : `<em>Arraste aqui um diário, página, ator, item ou cena</em>`}</div>`
    + (o.link ? `<button type="button" class="mf-mini" data-act="obj-openlink" data-tooltip="Abrir"><i class="fa-solid fa-book-open"></i></button><button type="button" class="mf-mini" data-act="obj-unlink" data-tooltip="Desligar"><i class="fa-solid fa-link-slash"></i></button>` : "")
    + `</div>`);
  const actions = `<div class="mf-actions mf-wrap">`
    + `<button type="button" data-act="obj-hide" class="${o.hidden ? "is-warn" : ""}"><i class="fa-solid ${o.hidden ? "fa-eye" : "fa-eye-slash"}"></i> ${o.hidden ? "Revelar aos jogadores" : "Esconder dos jogadores"}</button>`
    + `<button type="button" data-act="obj-dup"><i class="fa-solid fa-clone"></i> Duplicar</button>`
    + `<button type="button" data-act="obj-front"><i class="fa-solid fa-arrow-up"></i> Frente</button>`
    + `<button type="button" data-act="obj-back"><i class="fa-solid fa-arrow-down"></i> Trás</button>`
    + `<button type="button" data-act="obj-chat"><i class="fa-solid fa-comment"></i> Chat</button>`
    + `<button type="button" data-act="obj-focusall"><i class="fa-solid fa-bullseye"></i> Mostrar a todos</button>`
    + `<button type="button" class="mf-danger" data-act="obj-delete"><i class="fa-solid fa-trash"></i> Excluir</button></div>`;
  return `<div class="mf-tooltitle">${head}${o.hidden ? ` <span class="mf-badge">escondido</span>` : ""}</div>${actions}${body}${common}`;
}

/* ---------------------------------------------------------------------------------------------- */
/* Map settings                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

export function mapPanel(app) {
  const m = app.mapData;
  const b = m.base;
  const bases = Object.entries(BASES).map(([k, label]) => `<label class="mf-radio"><input type="radio" name="mmfu-base" data-f="m:base.kind" data-type="str" value="${k}"${k === b.kind ? " checked" : ""}><span>${h(label)}</span></label>`).join("");
  let baseExtra = "";
  if ( b.kind === "gerado" ) {
    baseExtra = select("Forma", "m:base.gen.shape", b.gen.shape, SHAPES)
      + range("Quanta terra", "m:base.gen.land", b.gen.land, 0.08, 0.7, 0.01, pct)
      + range("Litoral recortado", "m:base.gen.rough", b.gen.rough, 0, 1, 0.05, pct)
      + range("Ilhas pequenas", "m:base.gen.islands", b.gen.islands, 0, 1, 0.05, pct)
      + number("Semente", "m:base.seed", b.seed, 1, 2147483647, 1)
      + `<div class="mf-actions"><button type="button" data-act="gen-new"><i class="fa-solid fa-dice"></i> Sortear outro mundo</button></div>`;
  }
  else if ( b.kind === "imagem" ) {
    baseExtra = text("Imagem", "m:base.image", b.image, { placeholder: "caminho/da/imagem.webp", act: `<button type="button" class="mf-mini" data-act="pick-image" data-tooltip="Escolher arquivo"><i class="fa-solid fa-folder-open"></i></button>` })
      + select("Encaixe", "m:base.imageFit", b.imageFit, { cover: "Preencher (corta as sobras)", contain: "Inteira (sobra mar)", stretch: "Esticar" })
      + `<p class="mf-hint">Com imagem própria não há terras para o balde nem recorte \"só na terra\" no pincel.</p>`;
  }
  else if ( b.kind !== "vazio" ) {
    baseExtra = range("Suavidade do litoral", "m:style.landTension", m.style.landTension, 0, 1, 0.05, pct);
  }
  const themes = Object.entries(THEMES).map(([k, t]) => `<button type="button" class="mf-theme${k === m.style.theme ? " is-on" : ""}" data-act="pick-theme" data-key="${k}">`
    + `<span class="mf-theme-sw" style="--a:${t.sea};--b:${t.land};--c:${t.coast}"></span><span>${h(t.label)}</span></button>`).join("");
  const t = THEMES[m.style.theme];
  const decor = Object.entries(DECOR).map(([k, label]) => check(label, `m:style.decor.${k}`, m.style.decor[k])).join("");
  return section("Base do mapa", `<div class="mf-radios">${bases}</div>${baseExtra}`)
    + section("Estilo", `<div class="mf-themes">${themes}</div>`
      + colorField("Mar", "m:style.sea", m.style.sea, { nullable: true, fallback: t.sea })
      + colorField("Terra", "m:style.land", m.style.land, { nullable: true, fallback: t.land })
      + colorField("Litoral", "m:style.coast", m.style.coast, { nullable: true, fallback: t.coast }))
    + section("Enfeites", decor)
    + section("Cabeçalho da ficha", text("Mundo", "m:info.world", m.info.world) + text("Mapa nº", "m:info.number", m.info.number) + text("Região", "m:info.region", m.info.region))
    + section("Viagem", number("Quadrados por dia de viagem", "m:style.dayCells", m.style.dayCells, 0.25, 20, 0.25)
      + `<p class="mf-hint">O Livro Básico (p. 149) pede que o grupo defina quanto vale um dia de Viagem no mapa. A escala e a régua seguem este valor.</p>`)
    + section("Pintura", `<p class="mf-hint">${app.paintData.strokes.length} pinceladas${app.paintData.image ? " + pintura consolidada" : ""}, cerca de ${Math.max(1, Math.round(JSON.stringify(app.paintData).length / 1024))} KB. Cada salvamento envia a pintura inteira a todos; acima de uns 600 KB, consolide.</p>`
      + `<div class="mf-actions mf-wrap"><button type="button" data-act="paint-consolidate"${app.paintData.strokes.length ? "" : " disabled"}><i class="fa-solid fa-layer-group"></i> Consolidar pintura</button></div>`)
    + section("Recomeçar", `<div class="mf-actions mf-wrap">`
      + `<button type="button" class="mf-danger" data-act="paint-clear"><i class="fa-solid fa-paintbrush"></i> Limpar pintura</button>`
      + `<button type="button" class="mf-danger" data-act="objects-clear"><i class="fa-solid fa-stamp"></i> Remover carimbos, nomes e efeitos</button>`
      + `<button type="button" class="mf-danger" data-act="map-reset"><i class="fa-solid fa-bomb"></i> Mapa novo em folha</button></div>`, { open: false });
}

/* ---------------------------------------------------------------------------------------------- */
/* Places                                                                                           */
/* ---------------------------------------------------------------------------------------------- */

export function placesPanel(app, objects, query = "") {
  const items = objects.map(o => {
    const name = o.type === "label" ? (o.name || o.text) : o.name;
    if ( !name ) return null;
    const icon = o.type === "stamp" ? "fa-solid fa-location-dot" : o.type === "label" ? "fa-solid fa-font" : o.type === "fx" ? "fa-solid fa-wand-magic-sparkles"
      : o.type === "route" ? "fa-solid fa-route" : "fa-solid fa-draw-polygon";
    const sub = o.type === "stamp" ? STAMPS[o.key]?.label : o.type === "region" && o.threat ? `Ameaça: ${THREATS[o.threat].label} (d${THREATS[o.threat].die})` : "";
    return { o, name, icon, sub };
  }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const list = items.map(({ o, name, icon, sub }) => `<li data-act="place-go" data-id="${o.id}" data-search="${h(name.toLowerCase())}"${o.hidden ? ` class="is-hidden"` : ""}>`
    + `<i class="${icon}"></i><span class="pl-name">${h(name)}</span>${sub ? `<span class="pl-sub">${h(sub)}</span>` : ""}${o.link ? `<i class="fa-solid fa-book-open pl-link"></i>` : ""}</li>`).join("");
  return `<input type="search" class="mf-search" data-act="places-filter" placeholder="Procurar lugar..." value="${h(query)}">`
    + (items.length ? `<ul class="mf-places">${list}</ul>` : `<p class="mf-hint">Nenhum lugar com nome ainda.${game.user.isGM ? " Dê nome a carimbos, regiões e rotas para que apareçam aqui." : ""}</p>`);
}
