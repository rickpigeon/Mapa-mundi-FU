/**
 * Mapa-mundi-FU: save the map as a PNG (a still frame: effects become a static glow).
 */
import { MAP_H, MAP_W, shade } from "./constants.mjs";
import { AREA_FX, ELEMENTS, STAMPS } from "./catalog.mjs";
import { STAMP_PAD, STAMP_SVG, standaloneStamp, stampVars } from "./stamps-svg.mjs";
import { labelFont, layoutLabel, textureURL, themeOf } from "./view.mjs";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${String(src).slice(0, 60)}`));
    img.src = src;
  });
}

async function svgImage(inner, extraDefs = "") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MAP_W} ${MAP_H}" width="${MAP_W}" height="${MAP_H}">${extraDefs}${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    return await loadImage(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Replace <use href="#mmfu-st-key"> with the drawing itself (an SVG image cannot see the page's sprite). */
function inlineUses(markup) {
  return markup.replace(/<use href="#mmfu-st-(\w+)"[^>]*?(\/>|><\/use>)/g, (m, key) => STAMP_SVG[key] ?? "");
}


export async function exportPNG(view, map, { asPlayer = true, scale = 1 } = {}) {
  const t = themeOf(map);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(MAP_W * scale);
  canvas.height = Math.round(MAP_H * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  /* sea */
  const grad = map.style.theme === "ceu" ? ctx.createLinearGradient(0, 0, 0, MAP_H)
    : ctx.createRadialGradient(MAP_W / 2, MAP_H * 0.45, MAP_H * 0.3, MAP_W / 2, MAP_H * 0.45, MAP_W * 0.62);
  if ( map.style.theme === "ceu" ) { grad.addColorStop(0, t.sea2); grad.addColorStop(1, t.sea); }
  else { grad.addColorStop(0, t.sea); grad.addColorStop(1, t.sea2); }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  if ( t.texture === "stars" || t.texture === "scan" ) await drawTile(ctx, textureURL(t.texture));

  /* own image base */
  if ( map.base.kind === "imagem" && map.base.image ) {
    try {
      const img = await loadImage(map.base.image);
      const fit = map.base.imageFit;
      let w = MAP_W, h = MAP_H, x = 0, y = 0;
      if ( fit !== "stretch" ) {
        const k = fit === "contain" ? Math.min(MAP_W / img.width, MAP_H / img.height) : Math.max(MAP_W / img.width, MAP_H / img.height);
        w = img.width * k; h = img.height * k; x = (MAP_W - w) / 2; y = (MAP_H - h) / 2;
      }
      ctx.drawImage(img, x, y, w, h);
    } catch ( err ) {
      console.warn(err);
    }
  }

  /* under SVG (without the <image>), painting, grain, coastline/grid/decorations, regions/routes */
  ctx.drawImage(view.landCanvas, 0, 0, MAP_W, MAP_H);
  ctx.drawImage(view.paint.canvas, 0, 0, MAP_W, MAP_H);
  if ( t.texture === "paper" || t.texture === "parchment" ) await drawTile(ctx, textureURL(t.texture));
  ctx.drawImage(await svgImage(inlineUses(view.baseOver.innerHTML)), 0, 0, MAP_W, MAP_H);
  ctx.drawImage(await svgImage(view.vec.innerHTML), 0, 0, MAP_W, MAP_H);

  const visible = map.objects.filter(o => !(asPlayer && o.hidden));

  /* effects as a static glow */
  for ( const o of visible.filter(o => o.type === "fx") ) {
    const c = o.kind === "mana" ? ELEMENTS[o.element].color : (o.color ?? AREA_FX[o.kind].color);
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, `${c}aa`);
    g.addColorStop(0.6, `${c}44`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
  }

  /* stamps */
  for ( const o of visible.filter(o => o.type === "stamp") ) {
    const meta = STAMPS[o.key];
    if ( o.aura && ELEMENTS[o.aura] ) {
      const c = ELEMENTS[o.aura].color;
      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size * 0.75);
      g.addColorStop(0, `${c}99`); g.addColorStop(1, `${c}00`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.size * 0.75, 0, Math.PI * 2); ctx.fill();
    }
    const svg = standaloneStamp(o.key, stampVars(o.color ?? meta.c1, o.color2 ?? meta.c2));
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = await loadImage(url);
      ctx.save();
      ctx.globalAlpha = o.opacity;
      ctx.translate(o.x, o.y);
      ctx.rotate((o.rot * Math.PI) / 180);
      ctx.scale(o.flip ? -1 : 1, 1);
      const k = 1 + (STAMP_PAD * 2) / 100;
      ctx.drawImage(img, (-o.size * k) / 2, (-o.size * k) / 2, o.size * k, o.size * k);
      ctx.restore();
    } catch ( err ) {
      console.warn(err);
    } finally {
      URL.revokeObjectURL(url);
    }
    if ( o.showName && o.name ) {
      ctx.save();
      ctx.font = `700 ${Math.max(12, o.size * 0.22)}px Signika, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineWidth = 4;
      ctx.strokeStyle = t.paper;
      ctx.fillStyle = t.ink;
      ctx.strokeText(o.name, o.x, o.y + o.size * 0.5);
      ctx.fillText(o.name, o.x, o.y + o.size * 0.5);
      ctx.restore();
    }
  }

  /* names */
  for ( const o of visible.filter(o => o.type === "label") ) {
    const lay = layoutLabel(o);
    ctx.save();
    ctx.globalAlpha = o.opacity;
    ctx.translate(o.x, o.y);
    ctx.rotate((o.rot * Math.PI) / 180);
    ctx.font = labelFont(o);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for ( const l of lay.letters ) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate((l.rot * Math.PI) / 180);
      if ( o.fx !== "none" && o.fx !== "onda" && o.fx !== "flutuar" ) {
        ctx.shadowColor = o.fxColor;
        ctx.shadowBlur = o.size * 0.3;
      }
      if ( o.outlineW ) {
        ctx.lineWidth = o.outlineW * 2;
        ctx.strokeStyle = o.outline;
        ctx.strokeText(l.ch, 0, 0);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = o.color;
      ctx.fillText(l.ch, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
  return canvas;
}

async function drawTile(ctx, url) {
  if ( !url ) return;
  try {
    const img = await loadImage(url);
    const pattern = ctx.createPattern(img, "repeat");
    if ( !pattern ) return;
    ctx.save();
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    ctx.restore();
  } catch ( err ) {
    console.warn(err);
  }
}

/** Build the PNG and hand it to the browser as a download. */
export async function downloadPNG(view, map, opts) {
  const canvas = await exportPNG(view, map, opts);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if ( !blob ) throw new Error("O navegador não gerou a imagem.");
  const a = document.createElement("a");
  const name = (map.info.world || "mapa-mundi").normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase();
  a.href = URL.createObjectURL(blob);
  a.download = `${name || "mapa-mundi"}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
