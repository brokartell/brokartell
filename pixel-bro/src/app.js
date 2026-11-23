'use strict';
/* ==========================================================================
   Pixel Bro – moderner Pixel-Art- & Animations-Editor
   ========================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nativeApi = window.native || null; // Electron-Brücke (preload.js)
const APP_VERSION = '1.1.0';

/* ---------- Farben ---------- */
const pack = (r, g, b, a = 255) => (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
const unpack = (u) => [u & 255, (u >>> 8) & 255, (u >>> 16) & 255, u >>> 24];
const hex2 = (n) => n.toString(16).padStart(2, '0');
function toHex(u, withAlpha = false) {
  const [r, g, b, a] = unpack(u);
  return '#' + hex2(r) + hex2(g) + hex2(b) + (withAlpha && a !== 255 ? hex2(a) : '');
}
function parseHex(str) {
  let s = String(str).trim().replace(/^#/, '');
  if (s.length === 3 || s.length === 4) s = [...s].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) return null;
  const n = (i) => parseInt(s.slice(i, i + 2), 16);
  return pack(n(0), n(2), n(4), s.length === 8 ? n(6) : 255);
}
const cssColor = (u) => { const [r, g, b, a] = unpack(u); return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; };

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const hue = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)].map((v) => Math.round(v * 255));
}

/* ---------- Paletten ---------- */
const PALETTES = {
  'Bro 32': ['000000', '222034', '45283c', '663931', '8f563b', 'df7126', 'd9a066', 'eec39a', 'fbf236', '99e550', '6abe30', '37946e', '4b692f', '524b24', '323c39', '3f3f74', '306082', '5b6ee1', '639bff', '5fcde4', 'cbdbfc', 'ffffff', '9badb7', '847e87', '696a6a', '595652', '76428a', 'ac3232', 'd95763', 'd77bba', '8f974a', '8a6f30'],
  'PICO-8': ['000000', '1d2b53', '7e2553', '008751', 'ab5236', '5f574f', 'c2c3c7', 'fff1e8', 'ff004d', 'ffa300', 'ffec27', '00e436', '29adff', '83769c', 'ff77a8', 'ffccaa'],
  'Endesga 32': ['be4a2f', 'd77643', 'ead4aa', 'e4a672', 'b86f50', '733e39', '3e2731', 'a22633', 'e43b44', 'f77622', 'feae34', 'fee761', '63c74d', '3e8948', '265c42', '193c3e', '124e89', '0099db', '2ce8f5', 'ffffff', 'c0cbdc', '8b9bb4', '5a6988', '3a4466', '262b44', '181425', 'ff0044', '68386c', 'b55088', 'f6757a', 'e8b796', 'c28569'],
  'Sweetie 16': ['1a1c2c', '5d275d', 'b13e53', 'ef7d57', 'ffcd75', 'a7f070', '38b764', '257179', '29366f', '3b5dc9', '41a6f6', '73eff7', 'f4f4f4', '94b0c2', '566c86', '333c57'],
  'Game Boy': ['0f380f', '306230', '8bac0f', '9bbc0f'],
  'Graustufen': ['000000', '222222', '444444', '666666', '888888', 'aaaaaa', 'cccccc', 'eeeeee', 'ffffff'],
};

/* ---------- Zustand ---------- */
let doc;            // { w, h, fps, layers: [{ name, visible, opacity, frames: [Uint32Array] }] } – Ebene 0 = unten
let cur = { layer: 0, frame: 0 };
let fileInfo = { path: null, name: 'unbenannt' };
let dirty = false;

const settings = {
  tool: 'pen',
  size: 1,
  filled: false,
  pixelPerfect: true,
  contiguous: true,
  shade: 10,
  mirrorX: false,
  mirrorY: false,
  grid: true,
  onion: false,
  tile: false,
  tileGrid: 0,
  primary: pack(255, 0, 77),
  secondary: 0,
  recent: [],
  palette: PALETTES['Bro 32'].map(parseHex),
  paletteName: 'Bro 32',
  theme: 'dark',
  playing: true,
  autoUpdate: true,
};

const view = { zoom: 16, ox: 0, oy: 0 };
let sel = null;     // { mask: Uint8Array(w*h) }
let float = null;   // { data: Uint32Array, mask: Uint8Array, w, h, x, y }
let clipboard = null;
const history = { undo: [], redo: [], max: 120 };

/* ---------- Dokument ---------- */
function createDoc(w, h) {
  return { w, h, fps: 8, layers: [makeLayer('Ebene 1', w, h, 1)] };
}
function makeLayer(name, w, h, frames) {
  return { name, visible: true, opacity: 1, frames: Array.from({ length: frames }, () => new Uint32Array(w * h)) };
}
const frameCount = () => doc.layers[0].frames.length;
const curBuf = () => doc.layers[cur.layer].frames[cur.frame];

function snapshot() {
  return {
    w: doc.w, h: doc.h, fps: doc.fps,
    layers: doc.layers.map((l) => ({ ...l, frames: l.frames.map((f) => f.slice()) })),
    cur: { ...cur },
  };
}
function restore(s) {
  doc = { w: s.w, h: s.h, fps: s.fps, layers: s.layers.map((l) => ({ ...l, frames: l.frames.map((f) => f.slice()) })) };
  cur = { ...s.cur };
  cur.layer = clamp(cur.layer, 0, doc.layers.length - 1);
  cur.frame = clamp(cur.frame, 0, frameCount() - 1);
  if (sel && sel.mask.length !== doc.w * doc.h) sel = null;
}
function pushUndo() {
  history.undo.push(snapshot());
  if (history.undo.length > history.max) history.undo.shift();
  history.redo.length = 0;
  markDirty();
}
function undo() {
  commitFloat(false);
  if (!history.undo.length) return toast('Nichts zum Rückgängigmachen');
  history.redo.push(snapshot());
  restore(history.undo.pop());
  afterStructureChange();
}
function redo() {
  commitFloat(false);
  if (!history.redo.length) return toast('Nichts zum Wiederholen');
  history.undo.push(snapshot());
  restore(history.redo.pop());
  afterStructureChange();
}
function markDirty() {
  dirty = true;
  updateTitle();
  scheduleAutosave();
}
function updateTitle() {
  document.title = `${dirty ? '● ' : ''}${fileInfo.name} – Pixel Bro`;
}

/* ---------- Canvas & Rendering ---------- */
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const stage = $('#stage');
const comp = document.createElement('canvas');   // Komposit eines Frames
const compCtx = comp.getContext('2d');
const tmp = document.createElement('canvas');    // Zwischenpuffer pro Ebene
const tmpCtx = tmp.getContext('2d');
let checkerPattern = null;

function bufToImageData(buf, w, h) {
  return new ImageData(new Uint8ClampedArray(buf.buffer, buf.byteOffset, w * h * 4), w, h);
}

/** Zeichnet Frame f aller sichtbaren Ebenen auf target (w×h). */
function drawComposite(targetCtx, f, includeFloat = true) {
  const { w, h } = doc;
  if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; }
  targetCtx.clearRect(0, 0, w, h);
  doc.layers.forEach((layer, li) => {
    if (!layer.visible) return;
    tmpCtx.putImageData(bufToImageData(layer.frames[f], w, h), 0, 0);
    targetCtx.globalAlpha = layer.opacity;
    targetCtx.drawImage(tmp, 0, 0);
    if (includeFloat && float && li === cur.layer && f === cur.frame) {
      const fc = document.createElement('canvas');
      fc.width = float.w; fc.height = float.h;
      fc.getContext('2d').putImageData(bufToImageData(float.data, float.w, float.h), 0, 0);
      targetCtx.drawImage(fc, float.x, float.y);
    }
  });
  targetCtx.globalAlpha = 1;
}

function compositeCanvas(f, includeFloat = true) {
  const c = document.createElement('canvas');
  c.width = doc.w; c.height = doc.h;
  drawComposite(c.getContext('2d'), f, includeFloat);
  return c;
}

function makeChecker() {
  const css = getComputedStyle(document.documentElement);
  const a = css.getPropertyValue('--checker-a').trim(), b = css.getPropertyValue('--checker-b').trim();
  const p = document.createElement('canvas');
  const s = 8 * devicePixelRatio;
  p.width = p.height = s * 2;
  const pc = p.getContext('2d');
  pc.fillStyle = a; pc.fillRect(0, 0, s * 2, s * 2);
  pc.fillStyle = b; pc.fillRect(s, 0, s, s); pc.fillRect(0, s, s, s);
  checkerPattern = ctx.createPattern(p, 'repeat');
}

let renderQueued = false;
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
}

let hover = null; // { x, y } in Sprite-Koordinaten
let antsOffset = 0;

function render() {
  const dpr = devicePixelRatio;
  const cw = Math.round(stage.clientWidth * dpr), ch = Math.round(stage.clientHeight * dpr);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; makeChecker(); }
  if (!checkerPattern) makeChecker();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const { w, h } = doc;
  const z = view.zoom;
  const W = w * z, H = h * z;

  if (comp.width !== w || comp.height !== h) { comp.width = w; comp.height = h; }
  drawComposite(compCtx, cur.frame);

  const copies = settings.tile ? [-1, 0, 1] : [0];

  // Schachbrett-Hintergrund
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = checkerPattern;
  const minC = copies[0], span = copies.length;
  ctx.fillRect(Math.round((view.ox + minC * W) * dpr), Math.round((view.oy + minC * H) * dpr), Math.round(W * span * dpr), Math.round(H * span * dpr));
  ctx.restore();

  // Zwiebelhaut
  if (settings.onion && frameCount() > 1) {
    const draws = [[cur.frame - 1, 0.32], [cur.frame + 1, 0.16]];
    for (const [f, a] of draws) {
      if (f < 0 || f >= frameCount()) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(compositeCanvas(f, false), view.ox, view.oy, W, H);
    }
    ctx.globalAlpha = 1;
  }

  for (const cy of copies) for (const cx of copies) {
    ctx.globalAlpha = (cx || cy) ? 0.55 : 1;
    ctx.drawImage(comp, view.ox + cx * W, view.oy + cy * H, W, H);
  }
  ctx.globalAlpha = 1;

  // Pixelraster
  if (settings.grid && z >= 6) {
    ctx.beginPath();
    ctx.strokeStyle = settings.theme === 'light' ? 'rgba(0,0,0,.09)' : 'rgba(255,255,255,.07)';
    ctx.lineWidth = 1 / dpr;
    for (let x = 1; x < w; x++) { const px = Math.round((view.ox + x * z) * dpr) / dpr; ctx.moveTo(px, view.oy); ctx.lineTo(px, view.oy + H); }
    for (let y = 1; y < h; y++) { const py = Math.round((view.oy + y * z) * dpr) / dpr; ctx.moveTo(view.ox, py); ctx.lineTo(view.ox + W, py); }
    ctx.stroke();
  }
  // Kachelraster
  if (settings.tileGrid > 1) {
    const t = settings.tileGrid;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(124,92,255,.55)';
    ctx.lineWidth = 1;
    for (let x = t; x < w; x += t) { ctx.moveTo(view.ox + x * z, view.oy); ctx.lineTo(view.ox + x * z, view.oy + H); }
    for (let y = t; y < h; y += t) { ctx.moveTo(view.ox, view.oy + y * z); ctx.lineTo(view.ox + W, view.oy + y * z); }
    ctx.stroke();
  }
  // Rahmen
  ctx.strokeStyle = settings.theme === 'light' ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(view.ox - 0.5, view.oy - 0.5, W + 1, H + 1);

  // Auswahl
  drawSelectionOutline();

  // Formvorschau der Auswahl während des Ziehens
  if (drag && drag.selRect) {
    const r = drag.selRect;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(view.ox + r.x * z + 0.5, view.oy + r.y * z + 0.5, r.w * z - 1, r.h * z - 1);
    ctx.setLineDash([]);
  }

  // Cursor
  if (hover && !isPanning && ['pen', 'eraser', 'dither', 'shade', 'line', 'rect', 'ellipse'].includes(activeTool())) {
    const s = settings.size, o = Math.floor((s - 1) / 2);
    const x = view.ox + (hover.x - o) * z, y = view.oy + (hover.y - o) * z;
    if (activeTool() !== 'eraser' && activeTool() !== 'shade') {
      ctx.fillStyle = cssColor(settings.primary);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y, s * z, s * z);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeRect(x - 0.5, y - 0.5, s * z + 1, s * z + 1);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.strokeRect(x + 0.5, y + 0.5, s * z - 1, s * z - 1);
  }

  updateScrollbars();
}

/* ---------- Scrollleisten der Zeichenfläche ---------- */
const SCROLL_PAD = 48; // so weit darf man über den Bildrand hinaus scrollen
const scrollbars = {
  h: { el: $('#sbar-h'), axis: 'x' },
  v: { el: $('#sbar-v'), axis: 'y' },
};
/** Liefert für eine Achse: sichtbare Größe, Gesamtgröße und aktuelle Scrollposition. */
function scrollMetrics(axis) {
  const copies = settings.tile ? 3 : 1;
  const first = settings.tile ? -1 : 0;
  const size = (axis === 'x' ? doc.w : doc.h) * view.zoom;
  const origin = axis === 'x' ? view.ox : view.oy;
  const visible = axis === 'x' ? stage.clientWidth : stage.clientHeight;
  const contentStart = origin + first * size;      // linke/obere Kante des Inhalts
  const total = size * copies + SCROLL_PAD * 2;
  const pos = SCROLL_PAD - contentStart;            // 0 = ganz links/oben
  return { visible, total, pos, max: Math.max(0, total - visible), first, size };
}
function setScrollPos(axis, pos) {
  const m = scrollMetrics(axis);
  pos = clamp(pos, 0, m.max);
  const origin = SCROLL_PAD - pos - m.first * m.size;
  if (axis === 'x') view.ox = Math.round(origin); else view.oy = Math.round(origin);
  requestRender();
}
function updateScrollbars() {
  for (const sb of Object.values(scrollbars)) {
    const m = scrollMetrics(sb.axis);
    const show = m.total > m.visible + 1;
    sb.el.hidden = !show;
    if (!show) continue;
    const track = sb.axis === 'x' ? sb.el.clientWidth : sb.el.clientHeight;
    const len = Math.max(28, track * m.visible / m.total);
    const at = clamp(m.pos / m.max, 0, 1) * (track - len);
    const thumb = sb.el.firstElementChild;
    if (sb.axis === 'x') { thumb.style.width = len + 'px'; thumb.style.left = at + 'px'; }
    else { thumb.style.height = len + 'px'; thumb.style.top = at + 'px'; }
    sb.track = track; sb.len = len;
  }
}
for (const sb of Object.values(scrollbars)) {
  const thumb = sb.el.firstElementChild;
  const coord = (e) => (sb.axis === 'x' ? e.clientX : e.clientY);
  thumb.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    thumb.classList.add('dragging');
    const start = coord(e), startPos = scrollMetrics(sb.axis).pos;
    const move = (ev) => {
      const m = scrollMetrics(sb.axis);
      const free = Math.max(1, sb.track - sb.len);
      setScrollPos(sb.axis, startPos + (coord(ev) - start) * m.max / free);
    };
    const up = () => {
      thumb.classList.remove('dragging');
      thumb.removeEventListener('pointermove', move);
      thumb.removeEventListener('pointerup', up);
      thumb.removeEventListener('pointercancel', up);
    };
    thumb.addEventListener('pointermove', move);
    thumb.addEventListener('pointerup', up);
    thumb.addEventListener('pointercancel', up);
  });
  // Klick in die Leiste blättert eine Seite in diese Richtung
  sb.el.addEventListener('pointerdown', (e) => {
    if (e.target !== sb.el) return;
    const r = thumb.getBoundingClientRect();
    const before = sb.axis === 'x' ? e.clientX < r.left : e.clientY < r.top;
    const m = scrollMetrics(sb.axis);
    setScrollPos(sb.axis, m.pos + (before ? -1 : 1) * m.visible * 0.85);
  });
}

let selPathCache = { key: null, path: null };
function selectionSegments() {
  // Liefert Kanten der Maske (in Sprite-Koordinaten)
  let mask, mw, mh, ox, oy;
  if (float) { mask = float.mask; mw = float.w; mh = float.h; ox = float.x; oy = float.y; }
  else if (sel) { mask = sel.mask; mw = doc.w; mh = doc.h; ox = 0; oy = 0; }
  else return null;
  const key = mask;
  if (selPathCache.key !== key) {
    const segs = [];
    const at = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && mask[y * mw + x];
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      if (!mask[y * mw + x]) continue;
      if (!at(x, y - 1)) segs.push(x, y, x + 1, y);
      if (!at(x, y + 1)) segs.push(x, y + 1, x + 1, y + 1);
      if (!at(x - 1, y)) segs.push(x, y, x, y + 1);
      if (!at(x + 1, y)) segs.push(x + 1, y, x + 1, y + 1);
    }
    selPathCache = { key, segs };
  }
  return { segs: selPathCache.segs, ox, oy };
}
function drawSelectionOutline() {
  const s = selectionSegments();
  if (!s) return;
  const z = view.zoom;
  ctx.beginPath();
  const { segs, ox, oy } = s;
  for (let i = 0; i < segs.length; i += 4) {
    ctx.moveTo(Math.round(view.ox + (segs[i] + ox) * z) + 0.5, Math.round(view.oy + (segs[i + 1] + oy) * z) + 0.5);
    ctx.lineTo(Math.round(view.ox + (segs[i + 2] + ox) * z) + 0.5, Math.round(view.oy + (segs[i + 3] + oy) * z) + 0.5);
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#000';
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -antsOffset;
  ctx.stroke();
  ctx.setLineDash([]);
}
setInterval(() => { if (sel || float) { antsOffset = (antsOffset + 1) % 8; requestRender(); } }, 90);

/* ---------- Ansicht ---------- */
const ZOOMS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80];
function setZoom(z, cx, cy) {
  z = clamp(z, ZOOMS[0], ZOOMS[ZOOMS.length - 1]);
  if (cx === undefined) { cx = stage.clientWidth / 2; cy = stage.clientHeight / 2; }
  const sx = (cx - view.ox) / view.zoom, sy = (cy - view.oy) / view.zoom;
  view.zoom = z;
  view.ox = Math.round(cx - sx * z);
  view.oy = Math.round(cy - sy * z);
  $('#zoom-label').textContent = Math.round(z * 100) + '%';
  requestRender();
}
function zoomStep(dir, cx, cy) {
  let i = ZOOMS.findIndex((z) => z >= view.zoom);
  if (i < 0) i = ZOOMS.length - 1;
  if (ZOOMS[i] !== view.zoom && dir < 0) i++;
  setZoom(ZOOMS[clamp(i + dir, 0, ZOOMS.length - 1)], cx, cy);
}
function zoomFit() {
  const pad = 60;
  const sw = stage.clientWidth - pad, sh = stage.clientHeight - pad;
  let z = ZOOMS[0];
  for (const cand of ZOOMS) if (doc.w * cand <= sw && doc.h * cand <= sh) z = cand;
  view.zoom = z;
  view.ox = Math.round((stage.clientWidth - doc.w * z) / 2);
  view.oy = Math.round((stage.clientHeight - doc.h * z) / 2);
  $('#zoom-label').textContent = Math.round(z * 100) + '%';
  requestRender();
}

/* ---------- Pixel-Zugriff ---------- */
function inSel(x, y) { return !sel || sel.mask[y * doc.w + x] === 1; }
function wrapXY(x, y) {
  if (settings.tile) { x = ((x % doc.w) + doc.w) % doc.w; y = ((y % doc.h) + doc.h) % doc.h; }
  return [x, y];
}
function setPx(buf, x, y, color, rec) {
  [x, y] = wrapXY(x, y);
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h || !inSel(x, y)) return;
  const i = y * doc.w + x;
  if (buf[i] === color) return;
  if (rec) rec.push(i, buf[i]);
  buf[i] = color;
}
function mirrorPoints(x, y) {
  const pts = [[x, y]];
  const mx = doc.w - 1 - x, my = doc.h - 1 - y;
  if (settings.mirrorX) pts.push([mx, y]);
  if (settings.mirrorY) pts.push([x, my]);
  if (settings.mirrorX && settings.mirrorY) pts.push([mx, my]);
  return pts;
}
function stamp(buf, x, y, colorFn, rec) {
  const s = settings.size, o = Math.floor((s - 1) / 2);
  for (const [px, py] of mirrorPoints(x, y)) {
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      const tx = px - o + dx, ty = py - o + dy;
      setPx(buf, tx, ty, colorFn(tx, ty), rec);
    }
  }
}
function bresenham(x0, y0, x1, y1, cb) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    cb(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function getComposedPixel(x, y) {
  [x, y] = wrapXY(x, y);
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return null;
  const i = y * doc.w + x;
  if (curBuf()[i] >>> 24) return curBuf()[i];
  for (let l = doc.layers.length - 1; l >= 0; l--) {
    const L = doc.layers[l];
    if (L.visible && L.frames[cur.frame][i] >>> 24) return L.frames[cur.frame][i];
  }
  return 0;
}

/* ---------- Werkzeuge ---------- */
let drag = null;
let isPanning = false;
let spaceDown = false, altDown = false, shiftDown = false;

function activeTool() {
  if (spaceDown) return 'hand';
  if (altDown && ['pen', 'eraser', 'bucket', 'dither', 'line', 'rect', 'ellipse'].includes(settings.tool)) return 'picker';
  return settings.tool;
}

function spritePos(e) {
  const r = canvas.getBoundingClientRect();
  const fx = (e.clientX - r.left - view.ox) / view.zoom;
  const fy = (e.clientY - r.top - view.oy) / view.zoom;
  return { x: Math.floor(fx), y: Math.floor(fy), fx, fy };
}

function onPointerDown(e) {
  if (e.button === 1 || activeTool() === 'hand') {
    isPanning = true;
    drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: view.ox, oy: view.oy };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (e.button !== 0 && e.button !== 2) return;
  closeMenus();
  canvas.setPointerCapture(e.pointerId);
  const p = spritePos(e);
  const right = e.button === 2;
  const tool = activeTool();
  const color = right ? settings.secondary : settings.primary;

  if (tool !== 'move' && tool !== 'picker') commitFloat(false);

  switch (tool) {
    case 'pen':
    case 'eraser': {
      pushUndo();
      const c = tool === 'eraser' ? 0 : color;
      if (tool === 'pen') addRecent(c);
      drag = { tool, color: c, last: p, pts: [], buf: curBuf() };
      plotPP(drag, p.x, p.y);
      break;
    }
    case 'dither': {
      pushUndo();
      const a = right ? settings.secondary : settings.primary, b = right ? settings.primary : settings.secondary;
      drag = { tool, last: p, buf: curBuf(), fn: (x, y) => (((x + y) & 1) ? b : a) };
      stamp(drag.buf, p.x, p.y, drag.fn);
      break;
    }
    case 'shade': {
      pushUndo();
      drag = { tool, last: p, buf: curBuf(), done: new Set(), darken: right || e.shiftKey };
      shadeAt(drag, p.x, p.y);
      break;
    }
    case 'bucket':
      pushUndo();
      addRecent(color);
      floodFill(curBuf(), p.x, p.y, color, settings.contiguous && !e.shiftKey);
      afterPaint();
      break;
    case 'picker': {
      const c = getComposedPixel(p.x, p.y);
      if (c !== null) { right ? (settings.secondary = c) : (settings.primary = c); updateColorUI(); }
      drag = { tool: 'picker', right };
      break;
    }
    case 'line':
    case 'rect':
    case 'ellipse':
      pushUndo();
      addRecent(color);
      drag = { tool, color, start: p, buf: curBuf(), backup: curBuf().slice() };
      drawShape(p, e.shiftKey);
      break;
    case 'select':
      drag = { tool, start: p, add: e.shiftKey, sub: e.ctrlKey, moved: false };
      break;
    case 'wand':
      magicWand(p.x, p.y, e.shiftKey, e.ctrlKey);
      break;
    case 'move':
      if (!float) liftSelection();
      drag = { tool, start: p, fx: float.x, fy: float.y };
      break;
  }
  requestRender();
}

function onPointerMove(e) {
  const p = spritePos(e);
  const inside = p.x >= 0 && p.y >= 0 && p.x < doc.w && p.y < doc.h;
  hover = settings.tile ? (() => { const [x, y] = wrapXY(p.x, p.y); return { x: p.x, y: p.y, wx: x, wy: y }; })() : (inside ? { x: p.x, y: p.y } : null);
  updateStatusPos(p);

  if (!drag) { requestRender(); return; }
  if (drag.pan) {
    view.ox = drag.ox + (e.clientX - drag.sx);
    view.oy = drag.oy + (e.clientY - drag.sy);
    requestRender();
    return;
  }
  // Zwischenpunkte für schnelle Bewegungen nutzen
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (events.length ? events : [e])) {
    const q = spritePos(ev);
    handleDragPoint(q, ev);
  }
  requestRender();
  scheduleUI();
}

function handleDragPoint(p, e) {
  switch (drag.tool) {
    case 'pen':
    case 'eraser':
      bresenham(drag.last.x, drag.last.y, p.x, p.y, (x, y) => plotPP(drag, x, y));
      drag.last = p;
      break;
    case 'dither':
      bresenham(drag.last.x, drag.last.y, p.x, p.y, (x, y) => stamp(drag.buf, x, y, drag.fn));
      drag.last = p;
      break;
    case 'shade':
      bresenham(drag.last.x, drag.last.y, p.x, p.y, (x, y) => shadeAt(drag, x, y));
      drag.last = p;
      break;
    case 'picker': {
      const c = getComposedPixel(p.x, p.y);
      if (c !== null) { drag.right ? (settings.secondary = c) : (settings.primary = c); updateColorUI(); }
      break;
    }
    case 'line':
    case 'rect':
    case 'ellipse':
      drawShape(p, e.shiftKey);
      break;
    case 'select': {
      const r = normRect(drag.start, p);
      drag.selRect = r;
      drag.moved = true;
      break;
    }
    case 'move':
      float.x = drag.fx + (p.x - drag.start.x);
      float.y = drag.fy + (p.y - drag.start.y);
      break;
  }
}

function onPointerUp(e) {
  if (!drag) return;
  if (drag.pan) {
    isPanning = false;
    canvas.style.cursor = '';
  } else if (drag.tool === 'select') {
    if (!drag.moved) {
      if (!drag.add) sel = null;
    } else {
      const r = clipRect(drag.selRect);
      if (r) {
        const mask = (drag.add || drag.sub) && sel ? sel.mask.slice() : new Uint8Array(doc.w * doc.h);
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) mask[y * doc.w + x] = drag.sub ? 0 : 1;
        setSelection(mask);
      }
    }
  } else if (drag.tool === 'picker') {
    // nichts
  } else if (drag.tool !== 'move') {
    afterPaint();
  }
  drag = null;
  requestRender();
  scheduleUI(true);
}

function normRect(a, b) {
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, w: Math.abs(a.x - b.x) + 1, h: Math.abs(a.y - b.y) + 1 };
}
function clipRect(r) {
  const x0 = clamp(r.x, 0, doc.w), y0 = clamp(r.y, 0, doc.h);
  const x1 = clamp(r.x + r.w, 0, doc.w), y1 = clamp(r.y + r.h, 0, doc.h);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function plotPP(d, x, y) {
  const last = d.pts[d.pts.length - 1];
  if (last && last.x === x && last.y === y) return;
  const rec = [];
  stamp(d.buf, x, y, () => d.color, rec);
  d.pts.push({ x, y, rec });
  if (settings.pixelPerfect && settings.size === 1 && d.pts.length >= 3) {
    const n = d.pts.length;
    const a = d.pts[n - 3], b = d.pts[n - 2], c = d.pts[n - 1];
    if (Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1 &&
        (b.x === a.x || b.y === a.y) && (b.x === c.x || b.y === c.y)) {
      for (let i = b.rec.length - 2; i >= 0; i -= 2) d.buf[b.rec[i]] = b.rec[i + 1];
      d.pts.splice(n - 2, 1);
    }
  }
  if (d.pts.length > 4) d.pts.splice(0, d.pts.length - 4);
}

function shadeAt(d, x, y) {
  const amt = (d.darken ? -1 : 1) * settings.shade / 100;
  const s = settings.size, o = Math.floor((s - 1) / 2);
  for (const [px, py] of mirrorPoints(x, y)) {
    for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
      let [tx, ty] = wrapXY(px - o + dx, py - o + dy);
      if (tx < 0 || ty < 0 || tx >= doc.w || ty >= doc.h || !inSel(tx, ty)) continue;
      const i = ty * doc.w + tx;
      if (d.done.has(i)) continue;
      d.done.add(i);
      const [r, g, b, a] = unpack(d.buf[i]);
      if (!a) continue;
      const [hh, ss, ll] = rgbToHsl(r, g, b);
      const [nr, ng, nb] = hslToRgb(hh, ss, clamp(ll + amt, 0, 1));
      d.buf[i] = pack(nr, ng, nb, a);
    }
  }
}

function drawShape(p, constrain) {
  const d = drag;
  d.buf.set(d.backup);
  let { x: x0, y: y0 } = d.start;
  let x1 = p.x, y1 = p.y;
  if (constrain) {
    const dx = x1 - x0, dy = y1 - y0;
    if (d.tool === 'line') {
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (adx > ady * 2) y1 = y0;
      else if (ady > adx * 2) x1 = x0;
      else { const m = Math.max(adx, ady); x1 = x0 + Math.sign(dx) * m; y1 = y0 + Math.sign(dy) * m; }
    } else {
      const m = Math.max(Math.abs(dx), Math.abs(dy));
      x1 = x0 + (dx < 0 ? -m : m); y1 = y0 + (dy < 0 ? -m : m);
    }
  }
  const col = () => d.color;
  const put = (x, y) => stamp(d.buf, x, y, col);
  if (d.tool === 'line') {
    bresenham(x0, y0, x1, y1, put);
    return;
  }
  const L = Math.min(x0, x1), R = Math.max(x0, x1), T = Math.min(y0, y1), B = Math.max(y0, y1);
  if (d.tool === 'rect') {
    for (let y = T; y <= B; y++) for (let x = L; x <= R; x++) {
      const edge = x === L || x === R || y === T || y === B;
      if (settings.filled || edge) (edge ? put : (xx, yy) => setPxMirror(d.buf, xx, yy, d.color))(x, y);
    }
    return;
  }
  // Ellipse
  const cx = (L + R + 1) / 2, cy = (T + B + 1) / 2, rx = (R - L + 1) / 2, ry = (B - T + 1) / 2;
  const inside = (x, y) => {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
    return nx * nx + ny * ny <= 1.0001;
  };
  for (let y = T; y <= B; y++) for (let x = L; x <= R; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    if (edge) put(x, y);
    else if (settings.filled) setPxMirror(d.buf, x, y, d.color);
  }
}
function setPxMirror(buf, x, y, color) {
  for (const [px, py] of mirrorPoints(x, y)) setPx(buf, px, py, color);
}

function floodFill(buf, x, y, color, contiguous) {
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) return;
  const { w, h } = doc;
  const target = buf[y * w + x];
  if (target === color) return;
  if (!contiguous) {
    for (let i = 0; i < buf.length; i++) if (buf[i] === target && (!sel || sel.mask[i])) buf[i] = color;
    return;
  }
  const stack = [y * w + x];
  const seen = new Uint8Array(w * h);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (buf[i] !== target || (sel && !sel.mask[i])) continue;
    buf[i] = color;
    const px = i % w, py = (i / w) | 0;
    if (px > 0) stack.push(i - 1);
    if (px < w - 1) stack.push(i + 1);
    if (py > 0) stack.push(i - w);
    if (py < h - 1) stack.push(i + w);
  }
}

function magicWand(x, y, add, sub) {
  commitFloat(false);
  if (x < 0 || y < 0 || x >= doc.w || y >= doc.h) { if (!add) setSelection(null); return; }
  const buf = curBuf(), { w, h } = doc;
  const target = buf[y * w + x];
  const mask = (add || sub) && sel ? sel.mask.slice() : new Uint8Array(w * h);
  const val = sub ? 0 : 1;
  if (!settings.contiguous) {
    for (let i = 0; i < buf.length; i++) if (buf[i] === target) mask[i] = val;
  } else {
    const seen = new Uint8Array(w * h);
    const stack = [y * w + x];
    while (stack.length) {
      const i = stack.pop();
      if (seen[i] || buf[i] !== target) continue;
      seen[i] = 1; mask[i] = val;
      const px = i % w, py = (i / w) | 0;
      if (px > 0) stack.push(i - 1);
      if (px < w - 1) stack.push(i + 1);
      if (py > 0) stack.push(i - w);
      if (py < h - 1) stack.push(i + w);
    }
  }
  setSelection(mask);
}

function setSelection(mask) {
  if (mask && !mask.some((v) => v)) mask = null;
  sel = mask ? { mask } : null;
  requestRender();
}

/* ---------- Schwebende Auswahl (Verschieben, Einfügen) ---------- */
function selBounds(mask, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function extract(buf, mask) {
  const { w, h } = doc;
  const m = mask || new Uint8Array(w * h).fill(1);
  const b = selBounds(m, w, h);
  if (!b) return null;
  const data = new Uint32Array(b.w * b.h), fm = new Uint8Array(b.w * b.h);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const si = (b.y + y) * w + b.x + x;
    if (m[si]) { data[y * b.w + x] = buf[si]; fm[y * b.w + x] = 1; }
  }
  return { data, mask: fm, w: b.w, h: b.h, x: b.x, y: b.y };
}
function liftSelection() {
  pushUndo();
  const buf = curBuf();
  float = extract(buf, sel ? sel.mask : null);
  if (!float) { float = { data: new Uint32Array(1), mask: new Uint8Array(1), w: 1, h: 1, x: 0, y: 0 }; }
  const m = sel ? sel.mask : null;
  for (let i = 0; i < buf.length; i++) if (!m || m[i]) buf[i] = 0;
  sel = null;
}
function commitFloat(keepSelection = true) {
  if (!float) return;
  const buf = curBuf(), { w, h } = doc;
  const mask = keepSelection ? new Uint8Array(w * h) : null;
  for (let y = 0; y < float.h; y++) for (let x = 0; x < float.w; x++) {
    const tx = float.x + x, ty = float.y + y;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
    const fi = y * float.w + x;
    if (!float.mask[fi]) continue;
    if (float.data[fi] >>> 24) buf[ty * w + tx] = float.data[fi];
    if (mask) mask[ty * w + tx] = 1;
  }
  float = null;
  sel = null;
  if (mask) setSelection(mask);
  afterPaint();
}

function copySel() {
  if (float) clipboard = { ...float, data: float.data.slice(), mask: float.mask.slice() };
  else clipboard = extract(curBuf(), sel ? sel.mask : null);
  if (clipboard) toast('Kopiert');
  return !!clipboard;
}
function cutSel() {
  if (!copySel()) return;
  deleteSel();
}
function pasteClip() {
  if (!clipboard) return toast('Zwischenablage ist leer');
  commitFloat(false);
  pushUndo();
  float = { ...clipboard, data: clipboard.data.slice(), mask: clipboard.mask.slice() };
  float.x = clamp(float.x, 0, Math.max(0, doc.w - float.w));
  float.y = clamp(float.y, 0, Math.max(0, doc.h - float.h));
  sel = null;
  setTool('move');
  requestRender();
  scheduleUI(true);
}
function deleteSel() {
  if (float) { float = null; sel = null; afterPaint(); return; }
  pushUndo();
  const buf = curBuf();
  for (let i = 0; i < buf.length; i++) if (!sel || sel.mask[i]) buf[i] = 0;
  afterPaint();
}
function nudge(dx, dy) {
  if (!float) liftSelection();
  float.x += dx; float.y += dy;
  requestRender();
  scheduleUI(true);
}

/* ---------- Bild-Transformationen ---------- */
function transformBuf(buf, w, h, kind) {
  const out = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = buf[y * w + x];
    if (kind === 'h') out[y * w + (w - 1 - x)] = v;
    else if (kind === 'v') out[(h - 1 - y) * w + x] = v;
    else if (kind === 'r') out[x * h + (h - 1 - y)] = v; // 90° im Uhrzeigersinn, neue Breite = h
  }
  return out;
}
function transformMask(m, w, h, kind) {
  const u = transformBuf(Uint32Array.from(m), w, h, kind);
  return Uint8Array.from(u);
}
function transform(kind) {
  if (sel || float) {
    if (!float) liftSelection();
    float.data = transformBuf(float.data, float.w, float.h, kind);
    float.mask = transformMask(float.mask, float.w, float.h, kind);
    if (kind === 'r') {
      const cx = float.x + float.w / 2, cy = float.y + float.h / 2;
      [float.w, float.h] = [float.h, float.w];
      float.x = Math.round(cx - float.w / 2); float.y = Math.round(cy - float.h / 2);
    }
    selPathCache.key = null;
    requestRender();
    scheduleUI(true);
    return;
  }
  pushUndo();
  const { w, h } = doc;
  for (const L of doc.layers) L.frames = L.frames.map((f) => transformBuf(f, w, h, kind));
  if (kind === 'r') { doc.w = h; doc.h = w; sel = null; }
  afterStructureChange();
  toast(kind === 'r' ? 'Sprite um 90° gedreht' : 'Sprite gespiegelt');
}

function resizeDoc(nw, nh, mode, anchor) {
  commitFloat(false);
  pushUndo();
  const { w, h } = doc;
  const [ax, ay] = anchor;
  const offX = Math.round((nw - w) * ax), offY = Math.round((nh - h) * ay);
  for (const L of doc.layers) {
    L.frames = L.frames.map((f) => {
      const out = new Uint32Array(nw * nh);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        let sx, sy;
        if (mode === 'scale') { sx = Math.floor(x * w / nw); sy = Math.floor(y * h / nh); }
        else { sx = x - offX; sy = y - offY; }
        if (sx >= 0 && sy >= 0 && sx < w && sy < h) out[y * nw + x] = f[sy * w + sx];
      }
      return out;
    });
  }
  doc.w = nw; doc.h = nh;
  sel = null;
  afterStructureChange();
  zoomFit();
}

function addOutline() {
  commitFloat(false);
  pushUndo();
  const buf = curBuf(), src = buf.slice(), { w, h } = doc;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (src[y * w + x] >>> 24) > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (op(x, y) || !inSel(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) buf[y * w + x] = settings.primary;
  }
  afterPaint();
  toast('Umriss in Primärfarbe hinzugefügt');
}
function replaceColor() {
  commitFloat(false);
  pushUndo();
  const from = settings.primary, to = settings.secondary;
  let n = 0;
  for (const L of doc.layers) for (const f of L.frames) for (let i = 0; i < f.length; i++) if (f[i] === from) { f[i] = to; n++; }
  afterPaint();
  toast(`${n} Pixel ersetzt (Primär → Sekundär)`);
}
/** Ersetzt eine Farbe in allen Ebenen und Frames (Doppelklick in der Live-Palette). */
async function replaceColorDialog(from) {
  const body = el(`
    <div class="field-row" style="align-items:center">
      <div class="field"><label>Alte Farbe</label><div class="color-preview" style="background:${cssColor(from)}"></div><span class="mono">${toHex(from, true).toUpperCase()}</span></div>
      <div class="field" style="flex:0;font-size:22px;padding-top:14px">→</div>
      <div class="field"><label>Neue Farbe</label><input type="color" id="rc-new" value="${toHex(from).slice(0, 7)}"><span class="mono" id="rc-hex">${toHex(from).toUpperCase()}</span></div>
    </div>
    <p class="hint">Betrifft ${usedCounts.get(from) || 0} Pixel in allen Ebenen und Frames. Die Deckkraft bleibt erhalten.</p>`);
  const inp = body.querySelector('#rc-new');
  inp.oninput = () => { body.querySelector('#rc-hex').textContent = inp.value.toUpperCase(); };
  const ok = await modal({ title: 'Farbe überall ersetzen', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Ersetzen', value: true, primary: true }] });
  if (!ok) return;
  const [r, g, b] = unpack(parseHex(inp.value));
  const to = pack(r, g, b, unpack(from)[3]);
  if (to === from) return;
  commitFloat(false);
  pushUndo();
  let n = 0;
  for (const L of doc.layers) for (const f of L.frames) for (let i = 0; i < f.length; i++) if (f[i] === from) { f[i] = to; n++; }
  if (settings.primary === from) settings.primary = to;
  if (settings.secondary === from) settings.secondary = to;
  afterPaint();
  updateColorUI();
  toast(`${n} Pixel umgefärbt`);
}

/* ---------- Ebenen ---------- */
function layerCmd(cmd) {
  commitFloat(false);
  const n = frameCount();
  switch (cmd) {
    case 'layer-add':
      pushUndo();
      doc.layers.splice(cur.layer + 1, 0, makeLayer(uniqueLayerName(), doc.w, doc.h, n));
      cur.layer++;
      break;
    case 'layer-dup': {
      pushUndo();
      const L = doc.layers[cur.layer];
      doc.layers.splice(cur.layer + 1, 0, { ...L, name: L.name + ' Kopie', frames: L.frames.map((f) => f.slice()) });
      cur.layer++;
      break;
    }
    case 'layer-del':
      if (doc.layers.length === 1) return toast('Die letzte Ebene kann nicht gelöscht werden');
      pushUndo();
      doc.layers.splice(cur.layer, 1);
      cur.layer = clamp(cur.layer - 1, 0, doc.layers.length - 1);
      break;
    case 'layer-up':
      if (cur.layer >= doc.layers.length - 1) return;
      pushUndo();
      [doc.layers[cur.layer], doc.layers[cur.layer + 1]] = [doc.layers[cur.layer + 1], doc.layers[cur.layer]];
      cur.layer++;
      break;
    case 'layer-down':
      if (cur.layer === 0) return;
      pushUndo();
      [doc.layers[cur.layer], doc.layers[cur.layer - 1]] = [doc.layers[cur.layer - 1], doc.layers[cur.layer]];
      cur.layer--;
      break;
    case 'layer-merge': {
      if (cur.layer === 0) return toast('Keine Ebene darunter');
      pushUndo();
      const top = doc.layers[cur.layer], bot = doc.layers[cur.layer - 1];
      const c = document.createElement('canvas'); c.width = doc.w; c.height = doc.h;
      const cc = c.getContext('2d', { willReadFrequently: true });
      bot.frames = bot.frames.map((bf, f) => {
        cc.clearRect(0, 0, doc.w, doc.h);
        tmp.width = doc.w; tmp.height = doc.h;
        tmpCtx.putImageData(bufToImageData(bf, doc.w, doc.h), 0, 0);
        cc.globalAlpha = bot.opacity; cc.drawImage(tmp, 0, 0);
        if (top.visible) {
          tmpCtx.putImageData(bufToImageData(top.frames[f], doc.w, doc.h), 0, 0);
          cc.globalAlpha = top.opacity; cc.drawImage(tmp, 0, 0);
        }
        cc.globalAlpha = 1;
        return new Uint32Array(cc.getImageData(0, 0, doc.w, doc.h).data.buffer);
      });
      bot.opacity = 1;
      doc.layers.splice(cur.layer, 1);
      cur.layer--;
      break;
    }
  }
  afterStructureChange();
}
function uniqueLayerName() {
  let i = doc.layers.length + 1;
  while (doc.layers.some((l) => l.name === 'Ebene ' + i)) i++;
  return 'Ebene ' + i;
}

/* ---------- Frames ---------- */
function frameCmd(cmd) {
  commitFloat(false);
  switch (cmd) {
    case 'frame-add':
      pushUndo();
      for (const L of doc.layers) L.frames.splice(cur.frame + 1, 0, new Uint32Array(doc.w * doc.h));
      cur.frame++;
      break;
    case 'frame-dup':
      pushUndo();
      for (const L of doc.layers) L.frames.splice(cur.frame + 1, 0, L.frames[cur.frame].slice());
      cur.frame++;
      break;
    case 'frame-del':
      if (frameCount() === 1) return toast('Der letzte Frame kann nicht gelöscht werden');
      pushUndo();
      for (const L of doc.layers) L.frames.splice(cur.frame, 1);
      cur.frame = clamp(cur.frame, 0, frameCount() - 1);
      break;
    case 'frame-prev': cur.frame = (cur.frame - 1 + frameCount()) % frameCount(); break;
    case 'frame-next': cur.frame = (cur.frame + 1) % frameCount(); break;
  }
  afterStructureChange();
}
function moveFrame(from, to) {
  if (from === to) return;
  commitFloat(false);
  pushUndo();
  for (const L of doc.layers) { const [f] = L.frames.splice(from, 1); L.frames.splice(to, 0, f); }
  cur.frame = to;
  afterStructureChange();
}

/* ---------- UI-Aktualisierung ---------- */
function afterPaint() {
  markDirty();
  requestRender();
  scheduleUI(true);
}
function afterStructureChange() {
  selPathCache.key = null;
  requestRender();
  updateStatus();
  scheduleUI(true);
}

let uiTimer = null, uiLast = 0;
function scheduleUI(now = false) {
  if (now) { clearTimeout(uiTimer); uiTimer = null; updatePanels(); return; }
  if (uiTimer) return;
  const wait = Math.max(0, 150 - (performance.now() - uiLast));
  uiTimer = setTimeout(() => { uiTimer = null; updatePanels(); }, wait);
}
function updatePanels() {
  uiLast = performance.now();
  renderLayers();
  renderFrames();
  updateStatus();
  refreshUsedPalette();
}

function thumbInto(c, drawFn) {
  const { w, h } = doc;
  c.width = w; c.height = h;
  drawFn(c.getContext('2d'));
}

function renderLayers() {
  const list = $('#layers');
  const editing = list.querySelector('input');
  if (editing) return; // nicht während der Umbenennung neu aufbauen
  list.innerHTML = '';
  for (let i = doc.layers.length - 1; i >= 0; i--) {
    const L = doc.layers[i];
    const row = document.createElement('div');
    row.className = 'layer' + (i === cur.layer ? ' active' : '') + (L.visible ? '' : ' hidden-layer');
    const c = document.createElement('canvas');
    thumbInto(c, (cc) => cc.putImageData(bufToImageData(L.frames[cur.frame], doc.w, doc.h), 0, 0));
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = L.name;
    name.title = 'Doppelklick zum Umbenennen';
    const vis = document.createElement('button');
    vis.className = 'vis';
    vis.title = L.visible ? 'Ausblenden' : 'Einblenden';
    vis.innerHTML = L.visible
      ? '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.2A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.4"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/></svg>';
    vis.onclick = (e) => { e.stopPropagation(); L.visible = !L.visible; markDirty(); requestRender(); scheduleUI(true); };
    row.onclick = () => { if (cur.layer !== i) { commitFloat(false); cur.layer = i; scheduleUI(true); requestRender(); } };
    name.ondblclick = (e) => {
      e.stopPropagation();
      const inp = document.createElement('input');
      inp.value = L.name;
      name.textContent = '';
      name.appendChild(inp);
      inp.focus(); inp.select();
      const done = (ok) => { if (ok && inp.value.trim()) { L.name = inp.value.trim(); markDirty(); } inp.remove(); scheduleUI(true); };
      inp.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); };
      inp.onblur = () => done(true);
    };
    row.append(c, name, vis);
    list.appendChild(row);
  }
  const op = Math.round(doc.layers[cur.layer].opacity * 100);
  $('#layer-opacity').value = op;
  $('#layer-opacity-val').textContent = op + '%';
}

let dragFrame = null;
function renderFrames() {
  const box = $('#frames');
  const scroll = box.scrollLeft;
  box.innerHTML = '';
  for (let f = 0; f < frameCount(); f++) {
    const el = document.createElement('div');
    el.className = 'frame' + (f === cur.frame ? ' active' : '');
    el.draggable = true;
    const c = document.createElement('canvas');
    thumbInto(c, (cc) => drawComposite(cc, f));
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = f + 1;
    el.append(c, num);
    el.onclick = () => { if (cur.frame !== f) { commitFloat(false); cur.frame = f; afterStructureChange(); } };
    el.ondragstart = (e) => { dragFrame = f; e.dataTransfer.effectAllowed = 'move'; };
    el.ondragover = (e) => { e.preventDefault(); el.classList.add('drag-over'); };
    el.ondragleave = () => el.classList.remove('drag-over');
    el.ondrop = (e) => { e.preventDefault(); el.classList.remove('drag-over'); if (dragFrame !== null) moveFrame(dragFrame, f); dragFrame = null; };
    el.oncontextmenu = (e) => { e.preventDefault(); cur.frame = f; frameMenu(e.clientX, e.clientY); };
    box.appendChild(el);
  }
  const add = document.createElement('button');
  add.className = 'frame-add';
  add.title = 'Neuer Frame';
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  add.onclick = () => frameCmd('frame-add');
  box.appendChild(add);
  box.scrollLeft = scroll;
}
function frameMenu(x, y) {
  closeMenus();
  const m = document.createElement('div');
  m.className = 'menu-list';
  m.style.cssText = `display:block;position:fixed;left:${x}px;top:${y - 140}px;min-width:200px`;
  m.id = 'ctx-menu';
  [['Frame duplizieren', 'frame-dup'], ['Neuer Frame danach', 'frame-add'], ['Frame löschen', 'frame-del']].forEach(([t, c]) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${t}</span>`;
    b.onclick = () => { m.remove(); frameCmd(c); };
    m.appendChild(b);
  });
  document.body.appendChild(m);
  setTimeout(() => document.addEventListener('pointerdown', function h(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('pointerdown', h); } }), 0);
}

function updateStatus() {
  $('#status-size').textContent = `${doc.w} × ${doc.h} px`;
  $('#status-frame').textContent = `Frame ${cur.frame + 1}/${frameCount()} · ${doc.layers[cur.layer].name}`;
  $('#undo-state') && null;
}
function updateStatusPos(p) {
  const [x, y] = wrapXY(p.x, p.y);
  const inside = x >= 0 && y >= 0 && x < doc.w && y < doc.h;
  let text = inside ? `x ${x}  y ${y}` : '–';
  if (drag && drag.start && ['line', 'rect', 'ellipse', 'select'].includes(drag.tool)) {
    const r = normRect(drag.start, p);
    text += `   ${r.w} × ${r.h}`;
  }
  $('#status-pos').textContent = text;
}

/* ---------- Vorschau ---------- */
const previewCanvas = $('#preview');
const pctx = previewCanvas.getContext('2d');
let previewFrame = 0, previewLast = 0;
function previewLoop(t) {
  requestAnimationFrame(previewLoop);
  const interval = 1000 / doc.fps;
  if (settings.playing && frameCount() > 1) {
    if (t - previewLast < interval) return;
    previewLast = t;
    previewFrame = (previewFrame + 1) % frameCount();
  } else {
    previewFrame = cur.frame;
    if (t - previewLast < 100) return;
    previewLast = t;
  }
  const box = previewCanvas.parentElement;
  const s = Math.max(1, Math.floor(Math.min((box.clientWidth - 12) / doc.w, (box.clientHeight - 12) / doc.h)));
  if (previewCanvas.width !== doc.w * s || previewCanvas.height !== doc.h * s) {
    previewCanvas.width = doc.w * s; previewCanvas.height = doc.h * s;
  }
  if (comp.width !== doc.w || comp.height !== doc.h) { comp.width = doc.w; comp.height = doc.h; }
  const c = compositeCanvas(Math.min(previewFrame, frameCount() - 1));
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.drawImage(c, 0, 0, previewCanvas.width, previewCanvas.height);
}

/* ---------- Farben-UI ---------- */
function updateColorUI() {
  $('#color-primary').style.setProperty('--c', cssColor(settings.primary));
  $('#color-secondary').style.setProperty('--c', cssColor(settings.secondary));
  const [, , , a] = unpack(settings.primary);
  $('#color-input').value = toHex(settings.primary).slice(0, 7);
  if (document.activeElement !== $('#hex-input')) $('#hex-input').value = toHex(settings.primary, true).toUpperCase();
  $('#alpha-input').value = a;
  $('#alpha-val').textContent = Math.round(a / 2.55) + '%';
  $$('.swatch').forEach((s) => {
    const u = Number(s.dataset.color);
    s.classList.toggle('is-primary', u === settings.primary);
    s.classList.toggle('is-secondary', u === settings.secondary && u !== settings.primary);
  });
  requestRender();
}
function addRecent(c) {
  if (!(c >>> 24)) return;
  settings.recent = [c, ...settings.recent.filter((x) => x !== c)].slice(0, 12);
  renderRecent();
  saveSettings();
}
function renderRecent() {
  const box = $('#recent-colors');
  box.innerHTML = '';
  for (const c of settings.recent) {
    const b = document.createElement('button');
    b.style.background = cssColor(c);
    b.title = toHex(c, true).toUpperCase();
    b.onclick = () => { settings.primary = c; updateColorUI(); };
    b.oncontextmenu = (e) => { e.preventDefault(); settings.secondary = c; updateColorUI(); };
    box.appendChild(b);
  }
}
/* Live-Palette „Benutzte Farben“: erkennt automatisch alle Farben im Sprite */
const USED = 'Benutzte Farben';
let usedKey = null;
let usedCounts = new Map();
const isLivePalette = () => settings.paletteName === USED;
function usedColors() {
  const m = new Map();
  for (const L of doc.layers) for (const f of L.frames) {
    for (let i = 0; i < f.length; i++) { const u = f[i]; if (u >>> 24) m.set(u, (m.get(u) || 0) + 1); }
  }
  return m;
}
function colorSortKey(u) {
  const [r, g, b] = unpack(u);
  const [h, sat, l] = rgbToHsl(r, g, b);
  return sat < 0.12 ? [-1, l] : [Math.round(h * 12), l]; // Grautöne zuerst, dann nach Farbton
}
function refreshUsedPalette(force = false) {
  if (!isLivePalette() || !doc) return;
  usedCounts = usedColors();
  const colors = [...usedCounts.keys()].sort((a, b) => {
    const ka = colorSortKey(a), kb = colorSortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
  const key = colors.join(',');
  if (force || key !== usedKey) {
    usedKey = key;
    settings.palette = colors;
    renderPalette();
  } else {
    $$('#palette .swatch').forEach((sw) => { sw.title = swatchTitle(Number(sw.dataset.color)); });
  }
}
function swatchTitle(c) {
  const hex = toHex(c, true).toUpperCase();
  if (!isLivePalette()) return hex;
  return `${hex} · ${usedCounts.get(c) || 0} Pixel`;
}

function renderPalette() {
  const box = $('#palette');
  box.innerHTML = '';
  const live = isLivePalette();
  $('#palette-hint').textContent = live
    ? 'Erkennt automatisch alle Farben im Sprite · Klick: Primär · Rechtsklick: Sekundär · Doppelklick: Farbe überall ersetzen'
    : 'Klick: Primär · Rechtsklick: Sekundär · Strg+Klick: entfernen';
  $('#palette-count').textContent = live ? String(settings.palette.length) : '';
  if (live && !settings.palette.length) {
    box.innerHTML = '<p class="hint palette-empty">Noch keine Farben benutzt – fang einfach an zu zeichnen.</p>';
  }
  settings.palette.forEach((c, idx) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.color = c;
    b.style.background = cssColor(c);
    b.title = swatchTitle(c);
    if (live) b.ondblclick = () => replaceColorDialog(c);
    b.onclick = (e) => {
      if (e.ctrlKey && !live) { settings.palette.splice(idx, 1); paletteEdited(); return; }
      settings.primary = c; updateColorUI();
    };
    b.oncontextmenu = (e) => { e.preventDefault(); settings.secondary = c; updateColorUI(); };
    box.appendChild(b);
  });
  const sel = $('#palette-select');
  sel.innerHTML = '';
  for (const name of [USED, ...Object.keys(PALETTES), 'Eigene Palette']) {
    const o = document.createElement('option');
    o.value = name;
    o.textContent = name === USED ? '★ Benutzte Farben (live)' : name;
    if (name === settings.paletteName) o.selected = true;
    sel.appendChild(o);
  }
  updateColorUI();
}
function paletteEdited() {
  settings.paletteName = 'Eigene Palette';
  localStorage.setItem('pixelbro.customPalette', JSON.stringify(settings.palette));
  renderPalette();
  saveSettings();
}

/* ---------- Werkzeugauswahl ---------- */
const TOOL_OPTIONS = {
  pen: ['size', 'pp'], eraser: ['size'], bucket: ['contig'], picker: [],
  line: ['size'], rect: ['size', 'fill'], ellipse: ['size', 'fill'],
  select: [], wand: ['contig'], move: [], dither: ['size'], shade: ['size', 'shade'], hand: [],
};
const TOOL_NAMES = {
  pen: 'Stift', eraser: 'Radierer', bucket: 'Füllen', picker: 'Pipette', line: 'Linie', rect: 'Rechteck',
  ellipse: 'Ellipse', select: 'Auswahl', wand: 'Zauberstab', move: 'Verschieben', dither: 'Dithering', shade: 'Aufhellen/Abdunkeln', hand: 'Hand',
};
function setTool(t) {
  if (t !== 'move' && float) commitFloat();
  settings.tool = t;
  $$('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  const opts = TOOL_OPTIONS[t] || [];
  $('#opt-size').hidden = !opts.includes('size');
  $('#opt-fill').hidden = !opts.includes('fill');
  $('#opt-pp').hidden = !opts.includes('pp');
  $('#opt-contig').hidden = !opts.includes('contig');
  $('#opt-shade').hidden = !opts.includes('shade');
  updateCursor();
  status(TOOL_NAMES[t]);
  requestRender();
}
function updateCursor() {
  const t = activeTool();
  canvas.style.cursor = t === 'hand' ? 'grab' : t === 'move' ? 'move' : t === 'picker' ? 'copy' : 'crosshair';
}
function setBrushSize(s) {
  settings.size = clamp(s, 1, 16);
  $('#brush-size').value = settings.size;
  $('#brush-size-val').textContent = settings.size + ' px';
  requestRender();
}

/* ---------- Dialoge ---------- */
function modal({ title, body, actions }) {
  return new Promise((resolve) => {
    $('#modal-title').textContent = title;
    const b = $('#modal-body');
    b.innerHTML = '';
    if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    const a = $('#modal-actions');
    a.innerHTML = '';
    const close = (v) => { $('#modal-backdrop').hidden = true; document.removeEventListener('keydown', onKey, true); resolve(v); };
    (actions || [{ label: 'OK', value: true, primary: true }]).forEach((act) => {
      const btn = document.createElement('button');
      btn.className = 'btn' + (act.primary ? ' primary' : '');
      btn.textContent = act.label;
      btn.onclick = () => close(act.value);
      a.appendChild(btn);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); const p = (actions || []).find((x) => x.primary); close(p ? p.value : true); }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    $('#modal-backdrop').hidden = false;
    const first = b.querySelector('input');
    if (first) setTimeout(() => { first.focus(); first.select && first.select(); }, 30);
  });
}
const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d; };

async function dialogNew() {
  const body = el(`
    <div class="field"><label>Vorlagen</label>
      <div class="chips">${[16, 24, 32, 48, 64, 128, 256].map((s) => `<button class="chip" data-s="${s}">${s} × ${s}</button>`).join('')}
        <button class="chip" data-w="160" data-h="144">160 × 144 (Handheld)</button></div></div>
    <div class="field-row">
      <div class="field"><label>Breite (px)</label><input type="number" id="nw" min="1" max="1024" value="${doc ? doc.w : 32}"></div>
      <div class="field"><label>Höhe (px)</label><input type="number" id="nh" min="1" max="1024" value="${doc ? doc.h : 32}"></div>
    </div>
    <p class="hint">Ungespeicherte Änderungen am aktuellen Sprite gehen verloren (Rückgängig bleibt möglich).</p>`);
  body.querySelectorAll('.chip').forEach((c) => c.onclick = () => {
    body.querySelector('#nw').value = c.dataset.s || c.dataset.w;
    body.querySelector('#nh').value = c.dataset.s || c.dataset.h;
  });
  const ok = await modal({ title: 'Neues Sprite', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Erstellen', value: true, primary: true }] });
  if (!ok) return;
  const w = clamp(parseInt(body.querySelector('#nw').value) || 32, 1, 1024);
  const h = clamp(parseInt(body.querySelector('#nh').value) || 32, 1, 1024);
  if (doc) pushUndo();
  newDocument(w, h);
}
function newDocument(w, h) {
  float = null; sel = null;
  doc = createDoc(w, h);
  cur = { layer: 0, frame: 0 };
  fileInfo = { path: null, name: 'unbenannt' };
  dirty = false;
  updateTitle();
  syncDocUI();
  zoomFit();
  afterStructureChange();
}
function syncDocUI() {
  $('#fps').value = doc.fps;
  $('#fps-val').textContent = doc.fps;
}

async function dialogResize() {
  const anchors = [['Oben links', 0, 0], ['Oben', .5, 0], ['Oben rechts', 1, 0], ['Links', 0, .5], ['Mitte', .5, .5], ['Rechts', 1, .5], ['Unten links', 0, 1], ['Unten', .5, 1], ['Unten rechts', 1, 1]];
  const body = el(`
    <div class="field-row">
      <div class="field"><label>Breite (px)</label><input type="number" id="rw" min="1" max="1024" value="${doc.w}"></div>
      <div class="field"><label>Höhe (px)</label><input type="number" id="rh" min="1" max="1024" value="${doc.h}"></div>
    </div>
    <div class="field"><label>Modus</label><select id="rm"><option value="canvas">Arbeitsfläche ändern (Pixel bleiben)</option><option value="scale">Skalieren (Nearest Neighbor)</option></select></div>
    <div class="field"><label>Ausrichtung</label><select id="ra">${anchors.map((a, i) => `<option value="${i}" ${i === 4 ? 'selected' : ''}>${a[0]}</option>`).join('')}</select></div>`);
  const ok = await modal({ title: 'Größe ändern', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Anwenden', value: true, primary: true }] });
  if (!ok) return;
  const nw = clamp(parseInt(body.querySelector('#rw').value) || doc.w, 1, 1024);
  const nh = clamp(parseInt(body.querySelector('#rh').value) || doc.h, 1, 1024);
  const a = anchors[parseInt(body.querySelector('#ra').value)];
  resizeDoc(nw, nh, body.querySelector('#rm').value, [a[1], a[2]]);
}

async function dialogTileGrid() {
  const body = el(`<div class="field"><label>Kachelgröße (0 = aus)</label>
    <div class="chips">${[0, 8, 16, 24, 32].map((s) => `<button class="chip" data-s="${s}">${s ? s + ' px' : 'Aus'}</button>`).join('')}</div>
    <input type="number" id="tg" min="0" max="512" value="${settings.tileGrid}"></div>
    <p class="hint">Hilft beim Zeichnen von Tilesets: zeigt ein Raster in der gewählten Kachelgröße.</p>`);
  body.querySelectorAll('.chip').forEach((c) => c.onclick = () => { body.querySelector('#tg').value = c.dataset.s; });
  const ok = await modal({ title: 'Kachelraster', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Übernehmen', value: true, primary: true }] });
  if (!ok) return;
  settings.tileGrid = clamp(parseInt(body.querySelector('#tg').value) || 0, 0, 512);
  saveSettings();
  requestRender();
}

function scaleOptions(def = 4) {
  return [1, 2, 4, 8, 10, 16, 20, 32].map((s) => `<option value="${s}" ${s === def ? 'selected' : ''}>${s}× (${doc.w * s} × ${doc.h * s} px)</option>`).join('');
}

async function dialogExportPNG() {
  commitFloat();
  const body = el(`<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(1)}</select></div>
    <div class="field"><label>Inhalt</label><select id="what"><option value="frame">Aktueller Frame (${cur.frame + 1})</option><option value="layer">Nur aktuelle Ebene</option></select></div>`);
  const ok = await modal({ title: 'Als PNG exportieren', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Exportieren', value: true, primary: true }] });
  if (!ok) return;
  const s = parseInt(body.querySelector('#sc').value);
  const what = body.querySelector('#what').value;
  const src = document.createElement('canvas'); src.width = doc.w; src.height = doc.h;
  const sc = src.getContext('2d');
  if (what === 'layer') sc.putImageData(bufToImageData(curBuf(), doc.w, doc.h), 0, 0);
  else drawComposite(sc, cur.frame);
  await saveCanvas(scaleCanvas(src, s), baseName() + '.png');
}
async function dialogExportSheet() {
  commitFloat();
  const n = frameCount();
  const body = el(`<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(1)}</select></div>
    <div class="field"><label>Anordnung</label><select id="lay"><option value="h">Horizontal (1 Zeile)</option><option value="v">Vertikal (1 Spalte)</option><option value="g">Raster</option></select></div>
    <div class="field"><label>Spalten (bei Raster)</label><input type="number" id="cols" min="1" max="${n}" value="${Math.ceil(Math.sqrt(n))}"></div>
    <p class="hint">${n} Frame(s) · ${doc.w} × ${doc.h} px pro Frame</p>`);
  const ok = await modal({ title: 'Spritesheet exportieren', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Exportieren', value: true, primary: true }] });
  if (!ok) return;
  const s = parseInt(body.querySelector('#sc').value);
  const lay = body.querySelector('#lay').value;
  const cols = lay === 'h' ? n : lay === 'v' ? 1 : clamp(parseInt(body.querySelector('#cols').value) || 1, 1, n);
  const rows = Math.ceil(n / cols);
  const sheet = document.createElement('canvas');
  sheet.width = doc.w * cols; sheet.height = doc.h * rows;
  const shc = sheet.getContext('2d');
  for (let f = 0; f < n; f++) shc.drawImage(compositeCanvas(f), (f % cols) * doc.w, Math.floor(f / cols) * doc.h);
  await saveCanvas(scaleCanvas(sheet, s), baseName() + '_sheet.png');
}
async function dialogExportGIF() {
  commitFloat();
  const body = el(`<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(4)}</select></div>
    <div class="field-row">
      <div class="field"><label>FPS</label><input type="number" id="gfps" min="1" max="50" value="${doc.fps}"></div>
      <div class="field"><label>Wiederholen</label><select id="loop"><option value="1">Endlos</option><option value="0">Einmal</option></select></div>
    </div>
    <p class="hint">Halbtransparente Pixel werden voll deckend gespeichert, vollständig transparente bleiben transparent.</p>`);
  const ok = await modal({ title: 'Animiertes GIF exportieren', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Exportieren', value: true, primary: true }] });
  if (!ok) return;
  const s = parseInt(body.querySelector('#sc').value);
  const fps = clamp(parseInt(body.querySelector('#gfps').value) || doc.fps, 1, 50);
  const loop = body.querySelector('#loop').value === '1';
  const bytes = buildGIF(s, fps, loop);
  await saveBytes(bytes, baseName() + '.gif', [{ name: 'GIF-Animation', extensions: ['gif'] }], 'image/gif');
}

function buildGIF(scale, fps, loop) {
  const W = doc.w * scale, H = doc.h * scale;
  const frames = [];
  const colors = new Map();
  const list = [[0, 0, 0]]; // Index 0 = transparent
  const raw = [];
  for (let f = 0; f < frameCount(); f++) {
    const c = compositeCanvas(f);
    raw.push(new Uint32Array(c.getContext('2d').getImageData(0, 0, doc.w, doc.h).data.buffer));
  }
  // Farben sammeln
  let reduce = 0;
  const key = (u) => { const [r, g, b] = unpack(u); const m = 0xff << reduce & 0xff; return ((r & m) << 16) | ((g & m) << 8) | (b & m); };
  const collect = () => {
    colors.clear(); list.length = 1;
    for (const buf of raw) for (const u of buf) {
      if ((u >>> 24) < 128) continue;
      const k = key(u);
      if (!colors.has(k)) { colors.set(k, list.length); list.push([(k >> 16) & 255, (k >> 8) & 255, k & 255]); }
    }
  };
  collect();
  while (list.length > 256 && reduce < 7) { reduce++; collect(); }
  if (reduce) toast('Zu viele Farben – GIF-Palette wurde reduziert');
  for (const buf of raw) {
    const idx = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = buf[Math.floor(y / scale) * doc.w + Math.floor(x / scale)];
      idx[y * W + x] = (u >>> 24) < 128 ? 0 : colors.get(key(u));
    }
    frames.push({ indices: idx, delay: 100 / fps });
  }
  return encodeGIF(W, H, frames, list, 0, loop);
}

function scaleCanvas(src, s) {
  if (s === 1) return src;
  const c = document.createElement('canvas');
  c.width = src.width * s; c.height = src.height * s;
  const cc = c.getContext('2d');
  cc.imageSmoothingEnabled = false;
  cc.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const baseName = () => fileInfo.name.replace(/\.[^.]+$/, '') || 'sprite';

async function saveCanvas(c, name) {
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await saveBytes(bytes, name, [{ name: 'PNG-Bild', extensions: ['png'] }], 'image/png');
}
async function saveBytes(bytes, name, filters, mime, path = null) {
  if (nativeApi) {
    const p = await nativeApi.saveFile({ defaultPath: path || name, filters, data: bytes, path });
    if (p) toast('Gespeichert: ' + p.split(/[\\/]/).pop());
    return p;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Download gestartet: ' + name);
  return name;
}

/* ---------- Projektdateien ---------- */
function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s) {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
function serialize() {
  return JSON.stringify({
    app: 'PixelBro', version: 1, w: doc.w, h: doc.h, fps: doc.fps,
    palette: settings.palette.map((c) => toHex(c, true)),
    layers: doc.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity, frames: l.frames.map((f) => b64(new Uint8Array(f.buffer))) })),
  });
}
function deserialize(text) {
  const o = JSON.parse(text);
  if (o.app !== 'PixelBro' || !o.layers) throw new Error('Keine Pixel-Bro-Datei');
  const d = { w: o.w, h: o.h, fps: o.fps || 8, layers: [] };
  for (const l of o.layers) {
    d.layers.push({
      name: l.name, visible: l.visible !== false, opacity: l.opacity ?? 1,
      frames: l.frames.map((s) => { const u = unb64(s); return new Uint32Array(u.buffer, 0, d.w * d.h).slice(); }),
    });
  }
  return { doc: d, palette: o.palette };
}
function loadProject(text, name, path) {
  try {
    const r = deserialize(text);
    if (doc) pushUndo();
    float = null; sel = null;
    doc = r.doc;
    cur = { layer: doc.layers.length - 1, frame: 0 };
    if (r.palette && r.palette.length && !isLivePalette()) { settings.palette = r.palette.map(parseHex).filter((x) => x !== null); settings.paletteName = 'Eigene Palette'; renderPalette(); }
    fileInfo = { path: path || null, name: name || 'unbenannt.pixelbro' };
    dirty = false;
    updateTitle();
    syncDocUI();
    zoomFit();
    afterStructureChange();
    toast('Geöffnet: ' + fileInfo.name);
  } catch (err) {
    modal({ title: 'Datei konnte nicht geöffnet werden', body: `<p>${err.message}</p>` });
  }
}
async function saveProject(saveAs = false) {
  commitFloat();
  const name = baseName() + '.pixelbro';
  const bytes = new TextEncoder().encode(serialize());
  const p = await saveBytes(bytes, name, [{ name: 'Pixel-Bro-Projekt', extensions: ['pixelbro'] }], 'application/json', saveAs ? null : fileInfo.path);
  if (p) {
    fileInfo = { path: nativeApi ? p : null, name: p.split(/[\\/]/).pop() };
    dirty = false;
    updateTitle();
  }
}
async function openProject() {
  if (nativeApi) {
    const r = await nativeApi.openFile({ filters: [{ name: 'Pixel-Bro-Projekt', extensions: ['pixelbro', 'json'] }] });
    if (r) loadProject(new TextDecoder().decode(r.data), r.name, r.path);
  } else $('#file-open').click();
}
async function importImage() {
  if (nativeApi) {
    const r = await nativeApi.openFile({ filters: [{ name: 'Bilder', extensions: ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'webp'] }] });
    if (r) handleImageBlob(new Blob([r.data]), r.name);
  } else $('#file-import').click();
}
async function handleImageBlob(blob, name) {
  const img = await createImageBitmap(blob).catch(() => null);
  if (!img) return toast('Bild konnte nicht gelesen werden');
  const body = el(`<p>${name} · ${img.width} × ${img.height} px</p>
    <div class="field"><label>Importieren als</label><select id="im">
      <option value="new">Neues Sprite</option>
      <option value="layer">Neue Ebene im aktuellen Frame</option>
      <option value="sheet">Spritesheet → Frames aufteilen</option>
    </select></div>
    <div class="field-row"><div class="field"><label>Frame-Breite</label><input type="number" id="fw" value="${Math.min(img.width, img.height)}"></div>
    <div class="field"><label>Frame-Höhe</label><input type="number" id="fh" value="${Math.min(img.width, img.height)}"></div></div>
    <p class="hint">Frame-Größe gilt nur für „Spritesheet“.</p>`);
  const ok = await modal({ title: 'Bild importieren', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Importieren', value: true, primary: true }] });
  if (!ok) return;
  const mode = body.querySelector('#im').value;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cc = c.getContext('2d', { willReadFrequently: true });
  cc.drawImage(img, 0, 0);
  commitFloat(false);
  if (mode === 'new') {
    if (img.width > 1024 || img.height > 1024) return toast('Maximal 1024 × 1024 px');
    if (doc) pushUndo();
    newDocument(img.width, img.height);
    doc.layers[0].frames[0] = new Uint32Array(cc.getImageData(0, 0, img.width, img.height).data.buffer);
    fileInfo.name = name;
  } else if (mode === 'layer') {
    pushUndo();
    const L = makeLayer(name.replace(/\.[^.]+$/, ''), doc.w, doc.h, frameCount());
    L.frames[cur.frame] = new Uint32Array(cc.getImageData(0, 0, doc.w, doc.h).data.buffer);
    doc.layers.splice(cur.layer + 1, 0, L);
    cur.layer++;
  } else {
    const fw = clamp(parseInt(body.querySelector('#fw').value) || 16, 1, 1024);
    const fh = clamp(parseInt(body.querySelector('#fh').value) || 16, 1, 1024);
    const cols = Math.floor(img.width / fw), rows = Math.floor(img.height / fh);
    if (!cols || !rows) return toast('Frame-Größe passt nicht ins Bild');
    if (doc) pushUndo();
    newDocument(fw, fh);
    const frames = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      frames.push(new Uint32Array(cc.getImageData(q * fw, r * fh, fw, fh).data.buffer));
    }
    doc.layers[0].frames = frames;
    fileInfo.name = name;
    toast(`${frames.length} Frames importiert`);
  }
  markDirty();
  updateTitle();
  zoomFit();
  afterStructureChange();
}

/* ---------- Autosave & Einstellungen ---------- */
let autosaveTimer = null;
function autosaveNow() {
  clearTimeout(autosaveTimer);
  try { localStorage.setItem('pixelbro.autosave', JSON.stringify({ name: fileInfo.name, path: fileInfo.path, data: serialize() })); } catch (e) { /* Speicher voll */ }
}
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try { localStorage.setItem('pixelbro.autosave', JSON.stringify({ name: fileInfo.name, path: fileInfo.path, data: serialize() })); } catch (e) { /* Speicher voll */ }
  }, 1200);
}
function saveSettings() {
  try {
    const { tool, size, filled, pixelPerfect, contiguous, shade, mirrorX, mirrorY, grid, onion, tileGrid, primary, secondary, recent, paletteName, theme, autoUpdate } = settings;
    localStorage.setItem('pixelbro.settings', JSON.stringify({ tool, size, filled, pixelPerfect, contiguous, shade, mirrorX, mirrorY, grid, onion, tileGrid, primary, secondary, recent, paletteName, theme, autoUpdate }));
  } catch (e) { /* ignorieren */ }
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('pixelbro.settings') || 'null');
    if (s) Object.assign(settings, s);
    if (settings.paletteName === 'Eigene Palette') {
      const p = JSON.parse(localStorage.getItem('pixelbro.customPalette') || 'null');
      if (p) settings.palette = p;
    } else if (PALETTES[settings.paletteName]) settings.palette = PALETTES[settings.paletteName].map(parseHex);
    else if (settings.paletteName === USED) settings.palette = [];
  } catch (e) { /* ignorieren */ }
}

/* ---------- Kommandos ---------- */
function toggleSetting(key, inputId) {
  settings[key] = !settings[key];
  if (inputId) $(inputId).checked = settings[key];
  saveSettings();
  requestRender();
  syncMenuChecks();
}
function syncMenuChecks() {
  const map = { 'toggle-grid': 'grid', 'toggle-tile': 'tile', 'toggle-onion': 'onion' };
  for (const [cmd, key] of Object.entries(map)) $$(`[data-cmd="${cmd}"]`).forEach((b) => b.classList.toggle('checked', !!settings[key]));
  $$('[data-cmd="toggle-tilegrid"]').forEach((b) => b.classList.toggle('checked', settings.tileGrid > 1));
  $$('[data-cmd="toggle-autoupdate"]').forEach((b) => b.classList.toggle('checked', !!settings.autoUpdate));
}

const commands = {
  new: dialogNew,
  open: openProject,
  save: () => saveProject(false),
  'save-as': () => saveProject(true),
  import: importImage,
  'export-png': dialogExportPNG,
  'export-sheet': dialogExportSheet,
  'export-gif': dialogExportGIF,
  undo, redo,
  cut: cutSel, copy: copySel, paste: pasteClip, delete: deleteSel,
  'select-all': () => { commitFloat(false); setSelection(new Uint8Array(doc.w * doc.h).fill(1)); },
  deselect: () => { commitFloat(false); setSelection(null); },
  resize: dialogResize,
  'flip-h': () => transform('h'),
  'flip-v': () => transform('v'),
  rotate: () => transform('r'),
  'replace-color': replaceColor,
  outline: addOutline,
  'clear-layer': () => { commitFloat(false); pushUndo(); curBuf().fill(0); afterPaint(); },
  'toggle-grid': () => toggleSetting('grid', '#opt-grid'),
  'toggle-tile': () => { toggleSetting('tile', '#opt-tile'); toast(settings.tile ? 'Kachel-Modus an – Zeichnen wiederholt sich nahtlos' : 'Kachel-Modus aus'); },
  'toggle-onion': () => toggleSetting('onion', '#opt-onion'),
  'toggle-tilegrid': dialogTileGrid,
  'zoom-in': () => zoomStep(1),
  'zoom-out': () => zoomStep(-1),
  'zoom-fit': zoomFit,
  'toggle-theme': () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = settings.theme;
    checkerPattern = null;
    saveSettings();
    requestRender();
  },
  shortcuts: showShortcuts,
  'update-check': () => checkForUpdates(true),
  'toggle-autoupdate': () => {
    settings.autoUpdate = !settings.autoUpdate;
    saveSettings();
    syncMenuChecks();
    toast(settings.autoUpdate ? 'Pixel Bro sucht beim Start automatisch nach Updates' : 'Automatische Update-Suche ist aus');
  },
  about: () => modal({
    title: 'Über Pixel Bro',
    body: `<div style="display:flex;gap:14px;align-items:center">
        <img src="icon.png" alt="" width="56" height="56" style="image-rendering:pixelated;border-radius:10px">
        <div><b style="font-size:16px;color:var(--text)">Pixel Bro ${APP_VERSION}</b><br>Moderner Pixel-Art- und Animations-Editor auf Deutsch</div>
      </div>
      <p>Entwickelt von <b style="color:var(--text)">Jens Niebisch</b><br>
        für <b style="color:var(--text)">Bro Kartell</b> – Multigaming Clan seit 2013</p>
      <p><a href="https://bro-kartell.com" target="_blank" rel="noopener">bro-kartell.com</a> ·
        <a href="https://bro-kartell.com/impressum.html" target="_blank" rel="noopener">Impressum</a></p>
      <p class="hint">© ${new Date().getFullYear()} Jens Niebisch · Bro Kartell. Alle Rechte vorbehalten.<br>
        Projekte werden als <code>.pixelbro</code>-Datei gespeichert, die aktuelle Arbeit wird zusätzlich automatisch gesichert.</p>
      ${nativeApi ? `<p class="hint">Updates: Pixel Bro fragt ${settings.autoUpdate ? 'beim Start' : 'nur auf Wunsch'} bei GitHub nach einer neuen Version
        (abschaltbar unter Hilfe → Automatisch nach Updates suchen).</p>` : ''}`,
  }),
  'layer-add': () => layerCmd('layer-add'),
  'layer-dup': () => layerCmd('layer-dup'),
  'layer-del': () => layerCmd('layer-del'),
  'layer-up': () => layerCmd('layer-up'),
  'layer-down': () => layerCmd('layer-down'),
  'layer-merge': () => layerCmd('layer-merge'),
  'frame-add': () => frameCmd('frame-add'),
  'frame-dup': () => frameCmd('frame-dup'),
  'frame-del': () => frameCmd('frame-del'),
  'frame-prev': () => frameCmd('frame-prev'),
  'frame-next': () => frameCmd('frame-next'),
};
function run(cmd) {
  closeMenus();
  const fn = commands[cmd];
  if (fn) fn();
}

function showShortcuts() {
  const rows = [
    ['B / E / G / I', 'Stift / Radierer / Füllen / Pipette'],
    ['L / R / O', 'Linie / Rechteck / Ellipse'],
    ['M / W / V', 'Auswahl / Zauberstab / Verschieben'],
    ['D / U / H', 'Dithering / Aufhellen-Abdunkeln / Hand'],
    ['Rechtsklick', 'Mit Sekundärfarbe zeichnen'],
    ['Alt (halten)', 'Pipette'],
    ['Leertaste (halten)', 'Ansicht verschieben'],
    ['Umschalt', 'Linien einrasten · Quadrat/Kreis · Auswahl erweitern'],
    ['Strg (Auswahl)', 'Von Auswahl abziehen'],
    ['X', 'Primär- und Sekundärfarbe tauschen'],
    ['[ / ]', 'Pinsel kleiner / größer'],
    ['Mausrad', 'Zoomen'],
    ['Umschalt + Mausrad', 'Waagerecht scrollen (oder die Scrollleisten nutzen)'],
    ['+ / − / 0', 'Zoom rein / raus / einpassen'],
    [', / .', 'Vorheriger / nächster Frame'],
    ['N / Umschalt+N', 'Neuer Frame / Frame duplizieren'],
    ['Pfeiltasten', 'Auswahl um 1 px verschieben'],
    ['Enter / Esc', 'Verschieben bestätigen / Auswahl aufheben'],
    ['T', 'Kachel-Modus'],
    ['#', 'Pixelraster'],
    ['Strg+Z / Strg+Y', 'Rückgängig / Wiederholen'],
    ['Strg+C / X / V', 'Kopieren / Ausschneiden / Einfügen'],
    ['Strg+S / Strg+Umschalt+S', 'Speichern / Speichern unter'],
  ];
  modal({ title: 'Tastenkürzel', body: `<table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>` });
}

/* ---------- Menüs ---------- */
function closeMenus() { $$('.menu.open').forEach((m) => m.classList.remove('open')); const c = $('#ctx-menu'); if (c) c.remove(); }
$$('.menu').forEach((m) => {
  const btn = $('.menu-btn', m);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Wurde das Menü gerade per Überfahren geöffnet, soll der Klick es nicht wieder schließen
    const open = m.classList.contains('open') && !m.dataset.hoverOpened;
    delete m.dataset.hoverOpened;
    closeMenus();
    if (!open) m.classList.add('open');
  });
  btn.addEventListener('mouseenter', () => {
    if ($('.menu.open') && !m.classList.contains('open')) { closeMenus(); m.classList.add('open'); m.dataset.hoverOpened = '1'; }
  });
  btn.addEventListener('mouseleave', () => { delete m.dataset.hoverOpened; });
});
document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
$$('[data-cmd]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); run(b.dataset.cmd); }));
$$('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

/* ---------- Tastatur ---------- */
const TOOL_KEYS = { b: 'pen', p: 'pen', e: 'eraser', g: 'bucket', i: 'picker', l: 'line', r: 'rect', o: 'ellipse', m: 'select', w: 'wand', v: 'move', d: 'dither', u: 'shade', h: 'hand' };
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type="text"], input[type="number"], select')) return;
  if (!$('#modal-backdrop').hidden) return;
  const k = e.key.toLowerCase();
  shiftDown = e.shiftKey;
  if (e.key === 'Alt') { e.preventDefault(); altDown = true; updateCursor(); return; }
  if (e.key === ' ') { e.preventDefault(); if (!spaceDown) { spaceDown = true; updateCursor(); } return; }

  if (e.ctrlKey || e.metaKey) {
    const map = { z: e.shiftKey ? 'redo' : 'undo', y: 'redo', s: e.shiftKey ? 'save-as' : 'save', o: 'open', n: 'new', i: 'import', e: 'export-png', g: 'export-gif', c: 'copy', x: 'cut', v: 'paste', a: 'select-all', d: 'deselect', r: 'resize' };
    if (map[k]) { e.preventDefault(); run(map[k]); }
    return;
  }
  if (e.shiftKey) {
    const map = { h: 'flip-h', v: 'flip-v', r: 'rotate', n: 'frame-dup', o: 'toggle-onion' };
    if (map[k]) { e.preventDefault(); run(map[k]); return; }
  }
  if (e.key === 'F1') { e.preventDefault(); return run('shortcuts'); }
  if (TOOL_KEYS[k] && !e.shiftKey) return setTool(TOOL_KEYS[k]);
  switch (e.key) {
    case 'x': case 'X': [settings.primary, settings.secondary] = [settings.secondary, settings.primary]; updateColorUI(); break;
    case '[': setBrushSize(settings.size - 1); break;
    case ']': setBrushSize(settings.size + 1); break;
    case '+': case '=': zoomStep(1); break;
    case '-': zoomStep(-1); break;
    case '0': zoomFit(); break;
    case '#': run('toggle-grid'); break;
    case 't': case 'T': run('toggle-tile'); break;
    case ',': run('frame-prev'); break;
    case '.': run('frame-next'); break;
    case 'n': run('frame-add'); break;
    case 'Delete': case 'Backspace': run('delete'); break;
    case 'Enter': commitFloat(); break;
    case 'Escape': if (float) commitFloat(false); else setSelection(null); break;
    case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown': {
      if (!(sel || float)) { if (e.key === 'ArrowLeft') run('frame-prev'); if (e.key === 'ArrowRight') run('frame-next'); break; }
      e.preventDefault();
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      nudge(d[0], d[1]);
      break;
    }
  }
});
document.addEventListener('keyup', (e) => {
  shiftDown = e.shiftKey;
  if (e.key === 'Alt') { altDown = false; updateCursor(); }
  if (e.key === ' ') { spaceDown = false; updateCursor(); }
});
window.addEventListener('blur', () => { altDown = spaceDown = false; updateCursor(); });

/* ---------- Events: Leinwand ---------- */
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
canvas.addEventListener('pointerleave', () => { if (!drag) { hover = null; requestRender(); $('#status-pos').textContent = '–'; } });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  if (e.shiftKey && !e.ctrlKey) {
    // Umschalt + Mausrad: waagerecht scrollen
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    setScrollPos('x', scrollMetrics('x').pos + d);
  } else if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomStep(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
  else { view.ox -= e.deltaX; requestRender(); }
}, { passive: false });
new ResizeObserver(() => requestRender()).observe(stage);

/* ---------- Events: Panels ---------- */
$('#brush-size').addEventListener('input', (e) => setBrushSize(+e.target.value));
$('#opt-filled').addEventListener('change', (e) => { settings.filled = e.target.checked; saveSettings(); });
$('#opt-pixelperfect').addEventListener('change', (e) => { settings.pixelPerfect = e.target.checked; saveSettings(); });
$('#opt-contiguous').addEventListener('change', (e) => { settings.contiguous = e.target.checked; saveSettings(); });
$('#shade-strength').addEventListener('input', (e) => { settings.shade = +e.target.value; saveSettings(); });
$('#opt-mirror-x').addEventListener('change', (e) => { settings.mirrorX = e.target.checked; saveSettings(); });
$('#opt-mirror-y').addEventListener('change', (e) => { settings.mirrorY = e.target.checked; saveSettings(); });
$('#opt-grid').addEventListener('change', (e) => { settings.grid = e.target.checked; saveSettings(); syncMenuChecks(); requestRender(); });
$('#opt-onion').addEventListener('change', (e) => { settings.onion = e.target.checked; saveSettings(); syncMenuChecks(); requestRender(); });
$('#opt-tile').addEventListener('change', (e) => { settings.tile = e.target.checked; syncMenuChecks(); requestRender(); });

$('#fps').addEventListener('input', (e) => { doc.fps = +e.target.value; $('#fps-val').textContent = doc.fps; markDirty(); });
$('#preview-play').addEventListener('click', () => {
  settings.playing = !settings.playing;
  $('#preview-play').innerHTML = settings.playing
    ? '<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8Z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>';
});

let opacityUndo = false;
$('#layer-opacity').addEventListener('pointerdown', () => { opacityUndo = false; });
$('#layer-opacity').addEventListener('input', (e) => {
  if (!opacityUndo) { pushUndo(); opacityUndo = true; }
  doc.layers[cur.layer].opacity = +e.target.value / 100;
  $('#layer-opacity-val').textContent = e.target.value + '%';
  requestRender();
});
$('#layer-opacity').addEventListener('change', () => { opacityUndo = false; scheduleUI(true); });

$('#color-primary').addEventListener('click', () => $('#color-input').click());
$('#color-secondary').addEventListener('click', () => { [settings.primary, settings.secondary] = [settings.secondary, settings.primary]; updateColorUI(); });
$('#swap-colors').addEventListener('click', () => { [settings.primary, settings.secondary] = [settings.secondary, settings.primary]; updateColorUI(); });
$('#color-input').addEventListener('input', (e) => {
  const c = parseHex(e.target.value);
  const a = unpack(settings.primary)[3] || 255;
  const [r, g, b] = unpack(c);
  settings.primary = pack(r, g, b, a);
  updateColorUI();
});
$('#color-input').addEventListener('change', saveSettings);
$('#hex-input').addEventListener('change', (e) => {
  const c = parseHex(e.target.value);
  if (c === null) { toast('Ungültiger HEX-Wert'); updateColorUI(); return; }
  settings.primary = c;
  updateColorUI();
  saveSettings();
});
$('#hex-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
$('#alpha-input').addEventListener('input', (e) => {
  const [r, g, b] = unpack(settings.primary);
  settings.primary = pack(r, g, b, +e.target.value);
  updateColorUI();
});
$('#palette-select').addEventListener('change', (e) => {
  const name = e.target.value;
  settings.paletteName = name;
  if (name === USED) { refreshUsedPalette(true); saveSettings(); return; }
  if (PALETTES[name]) settings.palette = PALETTES[name].map(parseHex);
  else settings.palette = JSON.parse(localStorage.getItem('pixelbro.customPalette') || '[]');
  renderPalette();
  saveSettings();
});
$('#pal-add').addEventListener('click', () => {
  if (isLivePalette()) settings.palette = settings.palette.slice(); // wird zur eigenen Palette
  if (settings.palette.includes(settings.primary)) return toast('Farbe ist bereits in der Palette');
  settings.palette.push(settings.primary);
  paletteEdited();
});
$('#pal-from-image').addEventListener('click', () => {
  const set = new Set();
  for (const L of doc.layers) for (const f of L.frames) for (const u of f) if (u >>> 24) set.add(u);
  if (!set.size) return toast('Das Bild enthält noch keine Farben');
  if (set.size > 256) return toast(`Zu viele Farben (${set.size}) – maximal 256`);
  settings.palette = [...set].sort((a, b) => rgbToHsl(...unpack(a).slice(0, 3))[0] - rgbToHsl(...unpack(b).slice(0, 3))[0]);
  paletteEdited();
  toast(`${set.size} Farben übernommen`);
});

$('#file-open').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) loadProject(await f.text(), f.name, null);
  e.target.value = '';
});
$('#file-import').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) handleImageBlob(f, f.name);
  e.target.value = '';
});

// Drag & Drop von Dateien
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files[0];
  if (!f) return;
  if (/\.(pixelbro|json)$/i.test(f.name)) loadProject(await f.text(), f.name, f.path || null);
  else if (f.type.startsWith('image/')) handleImageBlob(f, f.name);
});

window.addEventListener('beforeunload', (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- Updates (nur Windows-App) ---------- */
const updateBanner = $('#update-banner');
let updateKind = null;
let updateDismissed = false;

function checkForUpdates(manual) {
  if (!nativeApi || !nativeApi.checkForUpdates) {
    if (manual) toast('Die Browser-Version ist immer auf dem neuesten Stand');
    return;
  }
  if (manual) updateDismissed = false;
  nativeApi.checkForUpdates(manual);
}

function showUpdateBanner({ title, text, progress = null, actions = [] }) {
  if (updateDismissed) return;
  $('#ub-title').textContent = title;
  $('#ub-text').textContent = text;
  $('#ub-progress').hidden = progress === null;
  if (progress !== null) $('#ub-bar').style.width = clamp(progress, 0, 100) + '%';
  const box = $('#ub-actions');
  box.innerHTML = '';
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = 'btn' + (a.primary ? ' primary' : '');
    b.textContent = a.label;
    b.onclick = a.onClick;
    box.appendChild(b);
  }
  updateBanner.hidden = false;
}
function hideUpdateBanner(dismiss = false) {
  updateBanner.hidden = true;
  if (dismiss) updateDismissed = true;
}

function onUpdateStatus(st) {
  switch (st.state) {
    case 'checking':
      if (st.manual) toast('Suche nach Updates …');
      break;
    case 'none':
      hideUpdateBanner();
      if (st.manual) toast(`Pixel Bro ist aktuell (Version ${st.version})`);
      break;
    case 'error':
      if (st.manual) toast('Update-Suche fehlgeschlagen: ' + st.message);
      break;
    case 'downloading':
      if (st.version) updateBanner.dataset.version = st.version;
      showUpdateBanner({
        title: updateBanner.dataset.version ? `Update ${updateBanner.dataset.version} wird geladen …` : 'Update wird geladen …',
        text: 'Du kannst einfach weiterarbeiten.',
        progress: st.percent || 0,
      });
      break;
    case 'ready':
      updateDismissed = false;
      showUpdateBanner({
        title: `Version ${st.version} ist bereit`,
        text: 'Pixel Bro startet kurz neu, deine Arbeit wird vorher gesichert. Mit „Später“ wird das Update beim Schließen installiert.',
        actions: [
          { label: 'Jetzt neu starten', primary: true, onClick: installUpdateNow },
          { label: 'Später', onClick: () => hideUpdateBanner(true) },
        ],
      });
      break;
    case 'available-manual':
      showUpdateBanner({
        title: `Version ${st.version} ist da`,
        text: st.kind === 'portable'
          ? 'Lade die neue portable Version herunter und ersetze damit die alte Datei.'
          : 'Lade die neue Version herunter. Tipp: Mit dem Installer aktualisiert sich Pixel Bro künftig selbst.',
        actions: [
          { label: 'Herunterladen', primary: true, onClick: () => { nativeApi.openDownloadPage(); hideUpdateBanner(true); } },
          { label: 'Später', onClick: () => hideUpdateBanner(true) },
        ],
      });
      break;
  }
}

async function installUpdateNow() {
  commitFloat();
  autosaveNow();
  saveSettings();
  showUpdateBanner({ title: 'Update wird installiert …', text: 'Pixel Bro startet gleich neu.' });
  const ok = await nativeApi.installUpdate();
  if (!ok) { hideUpdateBanner(); toast('Update konnte nicht gestartet werden'); }
}

/* ---------- Toast & Status ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
function status(msg) { $('#status-msg').textContent = msg; }

/* ---------- Start ---------- */
function init() {
  loadSettings();
  document.documentElement.dataset.theme = settings.theme;
  $('#opt-filled').checked = settings.filled;
  $('#opt-pixelperfect').checked = settings.pixelPerfect;
  $('#opt-contiguous').checked = settings.contiguous;
  $('#shade-strength').value = settings.shade;
  $('#opt-mirror-x').checked = settings.mirrorX;
  $('#opt-mirror-y').checked = settings.mirrorY;
  $('#opt-grid').checked = settings.grid;
  $('#opt-onion').checked = settings.onion;
  $('#opt-tile').checked = settings.tile;
  setBrushSize(settings.size);

  let restored = false;
  try {
    const a = JSON.parse(localStorage.getItem('pixelbro.autosave') || 'null');
    if (a && a.data) {
      const r = deserialize(a.data);
      doc = r.doc;
      cur = { layer: doc.layers.length - 1, frame: 0 };
      fileInfo = { path: a.path || null, name: a.name || 'unbenannt' };
      restored = true;
    }
  } catch (e) { /* ignorieren */ }
  if (!restored) { doc = createDoc(32, 32); }

  syncDocUI();
  renderPalette();
  renderRecent();
  setTool(settings.tool in TOOL_NAMES ? settings.tool : 'pen');
  syncMenuChecks();
  updateTitle();
  requestAnimationFrame(() => { zoomFit(); afterStructureChange(); });
  requestAnimationFrame(previewLoop);
  if (restored) setTimeout(() => toast('Letzte Sitzung wiederhergestellt'), 400);

  if (nativeApi && nativeApi.onOpenPath) {
    nativeApi.onOpenPath((path, data) => loadProject(new TextDecoder().decode(data), path.split(/[\\/]/).pop(), path));
  }

  // Updates: nur in der Windows-App
  if (nativeApi && nativeApi.onUpdateStatus) {
    document.body.classList.add('is-desktop');
    nativeApi.onUpdateStatus(onUpdateStatus);
    nativeApi.updateInfo().then((info) => { updateKind = info.kind; }).catch(() => {});
    if (settings.autoUpdate) setTimeout(() => checkForUpdates(false), 4000);
  }
}
init();
