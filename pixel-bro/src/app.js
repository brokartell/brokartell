'use strict';
/* ==========================================================================
   Pixel Bro – moderner Pixel-Art- & Animations-Editor
   ========================================================================== */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nativeApi = window.native || null; // Electron-Brücke (preload.js)
const APP_VERSION = '1.6.0';

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
  // GB Studio (laut gbstudio.dev): Sprites = 3 Farben + #65FF00 für Transparenz, kein #306850
  'GB Studio – Sprites': ['071821', '86c06c', 'e0f8cf', '65ff00'],
  // GB Studio Hintergründe: alle 4 Stufen (dunkel → hell), kein #65FF00
  'GB Studio – Hintergründe': ['071821', '306850', '86c06c', 'e0f8cf'],
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
  center: false,
  gradSteps: 4,
  gradDither: true,
  sprayDensity: 6,
  lang: 'de',
  gbMode: 'color',   // GB-Studio-Prüfung: 'color' (Game Boy Color) oder 'classic' (Game Boy)
  gbSprite: false,   // klassisch: #65FF00 als Transparenz erlauben
  gbLabels: true,    // GB-Prüfung im Bild: Palettennummern auf den Kacheln zeigen
  gbUi: null,        // GBC: Palette 8 (Text/UI) der Szene, 4 HEX-Werte wie in GB Studio angezeigt – null = GB-Studio-Vorgabe
  exportFormat: 'png', // zuletzt benutztes Export-Format: 'png' | 'sheet' | 'gif'
};

const view = { zoom: 16, ox: 0, oy: 0 };
let sel = null;     // { mask: Uint8Array(w*h) }
let float = null;   // { data: Uint32Array, mask: Uint8Array, w, h, x, y }
let clipboard = null;
const history = { undo: [], redo: [], max: 120 };

/* ---------- Dokument ---------- */
function createDoc(w, h) {
  return { w, h, fps: 8, layers: [makeLayer(t('Ebene') + ' 1', w, h, 1)] };
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
  const was = dirty;
  dirty = true;
  if (!was) updateTitle(); else document.title.startsWith('●') || updateTitle();
  scheduleAutosave();
}
function updateTitle() {
  document.title = `${dirty ? '● ' : ''}${fileInfo.name === 'unbenannt' ? t('unbenannt') : fileInfo.name} – Pixel Bro`;
  renderTabs();
}

/* ---------- Tabs: mehrere Bilder gleichzeitig offen (seit 1.6.0) ----------
   Das aktive Bild liegt wie bisher in den globalen Variablen (doc, cur, fileInfo, dirty, history, sel, view).
   Beim Wechseln wird der Stand in tabs[activeTab] gesichert und der andere Tab geladen. Die Zwischenablage
   (clipboard) ist für alle Tabs gleich – so lässt sich etwas von einem Bild ins andere kopieren. */
const tabs = [];
let activeTab = 0;
function captureTab() {
  return { doc, cur: { ...cur }, fileInfo: { ...fileInfo }, dirty, undo: history.undo, redo: history.redo, sel, view: { ...view } };
}
function applyTab(tb) {
  float = null;
  doc = tb.doc; cur = { ...tb.cur }; fileInfo = { ...tb.fileInfo }; dirty = tb.dirty; sel = tb.sel;
  history.undo = tb.undo; history.redo = tb.redo;
  if (tb.view) Object.assign(view, tb.view);
  if (typeof gbView !== 'undefined') gbView.filter = -1;
  selPathCache.key = null;
  syncDocUI();
  updateTitle();
  if (!tb.view) zoomFit(); else showZoom(view.zoom);
  afterStructureChange();
}
const tabLabel = (tb) => (tb.fileInfo.name === 'unbenannt' ? t('unbenannt') : tb.fileInfo.name).replace(/\.pixelbro$/i, '');
/** Ist der aktive Tab ein leeres, unverändertes „unbenannt“? Dann darf er für ein neues Bild wiederverwendet werden. */
function activeTabIsBlank() {
  return !dirty && !fileInfo.path && fileInfo.name === 'unbenannt' && !history.undo.length
    && doc.layers.length === 1 && doc.layers[0].frames.length === 1 && !doc.layers[0].frames[0].some((u) => u);
}
/** Vor dem Öffnen/Anlegen eines Bildes: neuen Tab anlegen (außer der aktuelle ist leer). */
function prepareNewTab() {
  commitFloat(false);
  if (!tabs.length) return;
  if (activeTabIsBlank()) return;
  tabs[activeTab] = captureTab();
  tabs.push(null);
  activeTab = tabs.length - 1;
  history.undo = []; history.redo = [];
}
function switchTab(i) {
  if (i === activeTab || i < 0 || i >= tabs.length) return;
  commitFloat(false);
  tabs[activeTab] = captureTab();
  activeTab = i;
  applyTab(tabs[i]);
  scheduleAutosave();
}
function newTab() {
  prepareNewTab();
  newDocument(32, 32);
}
async function closeTab(i) {
  if (i === activeTab) commitFloat(false);
  const tb = i === activeTab ? captureTab() : tabs[i];
  if (tb.dirty) {
    if (i !== activeTab) switchTab(i);
    const r = await modal({ title: 'Tab schließen', body: `<p>${t('„{name}“ hat ungespeicherte Änderungen.', { name: tabLabel(tb) })}</p>`,
      actions: [{ label: 'Abbrechen', value: null }, { label: 'Nicht speichern', value: 'drop' }, { label: 'Speichern …', value: 'save', primary: true }] });
    if (!r) return;
    if (r === 'save' && !(await saveProject(false))) return;
    i = activeTab;
  }
  tabs.splice(i, 1);
  if (!tabs.length) {
    tabs.push(null); activeTab = 0;
    history.undo = []; history.redo = [];
    newDocument(32, 32);
    return;
  }
  if (i < activeTab) activeTab--;
  else if (i === activeTab) { activeTab = Math.min(i, tabs.length - 1); applyTab(tabs[activeTab]); }
  renderTabs();
  scheduleAutosave();
}
function renderTabs() {
  const box = $('#tabs');
  if (!box || !tabs.length) return;
  tabs[activeTab] = captureTab();
  box.innerHTML = tabs.map((tb, i) => `<div class="tab${i === activeTab ? ' active' : ''}" role="tab" data-i="${i}" title="${tb.fileInfo.path || tabLabel(tb)} · ${tb.doc.w} × ${tb.doc.h} px">
      <span class="tab-name">${tb.dirty ? '<i class="tab-dot"></i>' : ''}${tabLabel(tb).replace(/</g, '&lt;')}</span>
      <button class="tab-close" data-close="${i}" title="${t('Tab schließen (Strg+W)')}">×</button></div>`).join('');
}
$('#tabs').addEventListener('pointerdown', (e) => {
  const c = e.target.closest('[data-close]');
  if (c) { e.preventDefault(); return; }
  const tb = e.target.closest('.tab');
  if (!tb) return;
  if (e.button === 1) { e.preventDefault(); closeTab(+tb.dataset.i); return; }
  if (e.button === 0) switchTab(+tb.dataset.i);
});
$('#tabs').addEventListener('click', (e) => { const c = e.target.closest('[data-close]'); if (c) closeTab(+c.dataset.close); });
$('#tab-new').addEventListener('click', () => newTab());

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

// Knöpfe „Auswahl drehen / spiegeln“ nur zeigen, solange etwas ausgewählt oder eingefügt ist
let xformShown = null;
function updateXformButtons() {
  const has = !!(sel || float);
  if (has === xformShown) return;
  xformShown = has;
  $('#opt-xform').hidden = !has;
}
function render() {
  updateXformButtons();
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
    // leicht lila: auf hellen und dunklen Bildern sichtbar
    ctx.strokeStyle = 'rgba(124, 92, 255, .32)';
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
  // GB-Studio-Paletten: Kacheln mit Palettennummer
  if (gbView.on) drawGbOverlay(z);
  // Mittellinien (waagerecht + senkrecht durch die Bildmitte)
  if (settings.center) {
    const mx = Math.round((view.ox + (w * z) / 2) * dpr) / dpr + 0.5 / dpr;
    const my = Math.round((view.oy + (h * z) / 2) * dpr) / dpr + 0.5 / dpr;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(79, 209, 255, .85)';
    ctx.lineWidth = 1;
    ctx.moveTo(mx, view.oy); ctx.lineTo(mx, view.oy + H);
    ctx.moveTo(view.ox, my); ctx.lineTo(view.ox + W, my);
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

  // Verlauf: Richtungslinie während des Ziehens
  if (drag && drag.tool === 'gradient') {
    const a = drag.start, b = drag.endSnap || drag.end;
    const ax = view.ox + (a.x + 0.5) * z, ay = view.oy + (a.y + 0.5) * z, bx = view.ox + (b.x + 0.5) * z, by = view.oy + (b.y + 0.5) * z;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    for (const [px, py, c] of [[ax, ay, drag.c0], [bx, by, drag.c1]]) {
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = (c >>> 24) ? cssColor(c | 0xff000000) : '#fff'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
  }
  // Sprühdose: Kreis zeigt den Sprühbereich
  if (hover && !isPanning && activeTool() === 'spray') {
    const rr = sprayRadius() * z;
    ctx.beginPath();
    ctx.arc(view.ox + (hover.x + 0.5) * z, view.oy + (hover.y + 0.5) * z, rr, 0, Math.PI * 2);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.stroke();
    ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); ctx.setLineDash([]);
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
/** Liefert für eine Achse: sichtbare Größe, Gesamtgröße, aktuelle Scrollposition und ob etwas abgeschnitten ist.
    Der Scrollbereich umfasst Bild (+ Rand) UND den sichtbaren Bereich – so erscheint die Leiste, sobald ein Teil
    des Bildes aus dem Fenster ragt, auch wenn das Bild eigentlich kleiner als das Fenster ist (z. B. verschoben). */
function scrollMetrics(axis) {
  const copies = settings.tile ? 3 : 1;
  const first = settings.tile ? -1 : 0;
  const size = (axis === 'x' ? doc.w : doc.h) * view.zoom;
  const origin = axis === 'x' ? view.ox : view.oy;
  const visible = axis === 'x' ? stage.clientWidth : stage.clientHeight;
  const contentStart = origin + first * size;      // linke/obere Kante des Inhalts
  const contentEnd = contentStart + size * copies;
  const start = Math.min(contentStart - SCROLL_PAD, 0);
  const end = Math.max(contentEnd + SCROLL_PAD, visible);
  const total = end - start;
  const pos = -start;                               // 0 = ganz links/oben
  const cut = contentStart < -0.5 || contentEnd > visible + 0.5;
  return { visible, total, pos, max: Math.max(0, total - visible), cut };
}
function setScrollPos(axis, pos) {
  const m = scrollMetrics(axis);
  pos = clamp(pos, 0, m.max);
  const shift = Math.round(m.pos - pos);            // Inhalt um so viel verschieben
  if (axis === 'x') view.ox += shift; else view.oy += shift;
  requestRender();
}
function updateScrollbars() {
  for (const sb of Object.values(scrollbars)) {
    const m = scrollMetrics(sb.axis);
    const show = m.cut && m.max > 1;
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
    let last = coord(e);
    const move = (ev) => {
      // schrittweise: der Scrollbereich ändert sich beim Verschieben mit, deshalb immer vom aktuellen Stand aus
      const m = scrollMetrics(sb.axis);
      const d = coord(ev) - last; last = coord(ev);
      setScrollPos(sb.axis, m.pos + d * m.total / Math.max(1, sb.track));
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
  showZoom(z);
  requestRender();
}
// Zoom oben an der Zeichenfläche und unten in der Infoleiste anzeigen
function showZoom(z) {
  const txt = Math.round(z * 100) + '%';
  $('#zoom-label').textContent = txt;
  $('#status-zoom').textContent = 'Zoom ' + txt;
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
  showZoom(z);
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
  if (altDown && ['pen', 'eraser', 'bucket', 'dither', 'line', 'rect', 'ellipse', 'gradient', 'spray'].includes(settings.tool)) return 'picker';
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
    canvas.style.cursor = CURSORS.grabbing;
    return;
  }
  if (e.button !== 0 && e.button !== 2) return;
  closeMenus();
  canvas.setPointerCapture(e.pointerId);
  const p = spritePos(e);
  const right = e.button === 2;
  const tool = activeTool();
  const color = right ? settings.secondary : settings.primary;

  // Text-Werkzeug: in den eingefügten Text klicken = verschieben
  const onFloat = float && p.x >= float.x && p.y >= float.y && p.x < float.x + float.w && p.y < float.y + float.h;
  if (tool === 'text' && onFloat) {
    drag = { tool: 'move', start: p, fx: float.x, fy: float.y };
    requestRender();
    return;
  }
  if (tool !== 'move' && tool !== 'picker') commitFloat(false);

  switch (tool) {
    case 'gradient': {
      const region = gradientRegion(p.x, p.y);
      if (!region) break;
      pushUndo();
      const c0 = right ? settings.secondary : settings.primary, c1 = right ? settings.primary : settings.secondary;
      addRecent(c0);
      drag = { tool, start: p, end: p, buf: curBuf(), backup: curBuf().slice(), region, c0, c1 };
      applyGradient(drag, e.shiftKey);
      break;
    }
    case 'spray': {
      pushUndo();
      addRecent(color);
      const d = { tool, color, pos: p, buf: curBuf(), last: 0 };
      drag = d;
      sprayAt(d);
      d.timer = setInterval(() => { if (drag !== d) return; sprayAt(d); requestRender(); scheduleUI(); }, 60);
      break;
    }
    case 'text':
      textDialog(p);
      break;
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
    case 'gradient':
      drag.end = p;
      applyGradient(drag, e.shiftKey);
      break;
    case 'spray':
      drag.pos = p;
      if (performance.now() - drag.last > 30) sprayAt(drag);
      break;
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
  if (drag.timer) clearInterval(drag.timer);
  if (drag.pan) {
    isPanning = false;
    updateCursor();
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

/* ---------- Verlauf ---------- */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Bereich für den Verlauf: die Auswahl – oder wie beim Füllen alle Pixel mit der Farbe unter dem Startpunkt. */
function gradientRegion(x, y) {
  [x, y] = wrapXY(x, y);
  const { w, h } = doc;
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const out = [];
  if (sel) {
    for (let i = 0; i < sel.mask.length; i++) if (sel.mask[i]) out.push(i);
    return out.length ? Int32Array.from(out) : null;
  }
  const buf = curBuf();
  const target = buf[y * w + x];
  if (!settings.contiguous) {
    for (let i = 0; i < buf.length; i++) if (buf[i] === target) out.push(i);
    return Int32Array.from(out);
  }
  const seen = new Uint8Array(w * h);
  const stack = [y * w + x];
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (buf[i] !== target) continue;
    out.push(i);
    const px = i % w, py = (i / w) | 0;
    if (px > 0) stack.push(i - 1);
    if (px < w - 1) stack.push(i + 1);
    if (py > 0) stack.push(i - w);
    if (py < h - 1) stack.push(i + w);
  }
  return Int32Array.from(out);
}
/** Mischt zwei Farben (f = 0 → a, f = 1 → b). Transparente Farben übernehmen den Farbton der anderen. */
function mixColor(a, b, f) {
  const A = unpack(a), B = unpack(b);
  if (!A[3]) { A[0] = B[0]; A[1] = B[1]; A[2] = B[2]; }
  if (!B[3]) { B[0] = A[0]; B[1] = A[1]; B[2] = A[2]; }
  const m = (i) => Math.round(A[i] + (B[i] - A[i]) * f);
  const alpha = m(3);
  return alpha ? pack(m(0), m(1), m(2), alpha) : 0;
}
function applyGradient(d, constrain) {
  d.buf.set(d.backup);
  const { w } = doc;
  let ex = d.end.x, ey = d.end.y;
  if (constrain) { // in 45°-Schritten einrasten
    const dx = ex - d.start.x, dy = ey - d.start.y, adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx > ady * 2) ey = d.start.y;
    else if (ady > adx * 2) ex = d.start.x;
    else { const m = Math.max(adx, ady); ex = d.start.x + Math.sign(dx) * m; ey = d.start.y + Math.sign(dy) * m; }
  }
  d.endSnap = { x: ex, y: ey };
  const dx = ex - d.start.x, dy = ey - d.start.y, len2 = dx * dx + dy * dy;
  const n = clamp(settings.gradSteps | 0, 2, 16);
  const colors = Array.from({ length: n }, (_, k) => mixColor(d.c0, d.c1, k / (n - 1)));
  for (const i of d.region) {
    const x = i % w, y = (i / w) | 0;
    const tt = len2 ? clamp(((x - d.start.x) * dx + (y - d.start.y) * dy) / len2, 0, 1) : 0;
    const level = tt * (n - 1);
    let k;
    if (settings.gradDither) {
      const base = Math.floor(level);
      k = level - base > (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? base + 1 : base;
    } else k = Math.round(level);
    d.buf[i] = colors[clamp(k, 0, n - 1)];
  }
}

/* ---------- Sprühdose ---------- */
const sprayRadius = () => 2 + settings.size * 1.5;
function sprayAt(d) {
  d.last = performance.now();
  const r = sprayRadius();
  const n = clamp(settings.sprayDensity | 0, 1, 40);
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
    const x = Math.floor(d.pos.x + 0.5 + Math.cos(a) * rr), y = Math.floor(d.pos.y + 0.5 + Math.sin(a) * rr);
    for (const [px, py] of mirrorPoints(x, y)) setPx(d.buf, px, py, d.color);
  }
}

/* ---------- Text (Pixel-Schrift, 5 px hoch) ---------- */
const FONT = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
  E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
  M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.#./#.#/#.#/#.#/.#.', P: '##./#.#/##./#../#..',
  Q: '.#./#.#/#.#/##./.##', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.', T: '###/.#./.#./.#./.#.',
  U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#...#/#...#/#.#.#/##.##/#...#', X: '#.#/#.#/.#./#.#/#.#',
  Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###',
  0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.',
  4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.',
  8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
  ' ': '.../.../.../.../...', '.': '././././#', ',': './././#/#', '!': '#/#/#/./#', '?': '##./..#/.#./.../.#.',
  ':': './#/./#/.', ';': './#/./#/#', '-': '.../.../###/.../...', '+': '.../.#./###/.#./...', '=': '.../###/.../###/...',
  '/': '..#/..#/.#./#../#..', '(': '.#/#./#./#./.#', ')': '#./.#/.#/.#/#.', "'": '#/#/././.', '"': '#.#/#.#/.../.../...',
  '*': '.../#.#/.#./#.#/...', '_': '.../.../.../.../###', '%': '#.#/..#/.#./#../#.#', '<': '..#/.#./#../.#./..#',
  '>': '#../.#./..#/.#./#..', '#': '#.#/###/#.#/###/#.#', '&': '.#./#.#/.#./#.#/.##', '@': '.#./#.#/###/#../.##',
};
const UMLAUT = { 'Ä': 'A', 'Ö': 'O', 'Ü': 'U' };
function textPixels(text, spacing, color, scale = 1) {
  const lines = text.toUpperCase().replace(/ß/g, 'SS').replace(/\r/g, '').split('\n');
  const glyphs = (ch) => {
    const base = UMLAUT[ch] || ch;
    const g = (FONT[base] || FONT['?']).split('/');
    return { rows: g, w: Math.max(...g.map((r) => r.length)), dots: !!UMLAUT[ch] };
  };
  const pts = [];
  let maxW = 0;
  lines.forEach((line, li) => {
    let x = 0;
    const top = li * 8 + 2; // 2 Reihen Platz für Umlaut-Punkte
    for (const ch of line) {
      const g = glyphs(ch);
      g.rows.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === '#') pts.push([x + rx, top + ry]); }));
      if (g.dots) { pts.push([x, top - 2]); pts.push([x + g.w - 1, top - 2]); }
      x += g.w + spacing;
    }
    maxW = Math.max(maxW, x - spacing);
  });
  if (!pts.length) return null;
  const minX = Math.min(...pts.map((q) => q[0])), minY = Math.min(...pts.map((q) => q[1]));
  const maxX = Math.max(...pts.map((q) => q[0])), maxY = Math.max(...pts.map((q) => q[1]));
  // Schriftgröße: jeder Schrift-Pixel wird zu einem Block aus scale × scale Pixeln
  const w = (maxX - minX + 1) * scale, h = (maxY - minY + 1) * scale;
  if (w * h > 4096 * 4096) return null;
  const data = new Uint32Array(w * h), mask = new Uint8Array(w * h);
  for (const [x, y] of pts) {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = ((y - minY) * scale + dy) * w + (x - minX) * scale + dx;
      data[i] = color; mask[i] = 1;
    }
  }
  return { data, mask, w, h };
}
let lastText = '';
let lastTextSpacing = 1;
let lastTextScale = 2;
const TEXT_SCALES = [1, 2, 3, 4, 5, 6, 8, 10];
async function textDialog(p) {
  const body = el(`<div class="field"><label>Text</label><textarea id="tx" rows="3" maxlength="400" spellcheck="false"></textarea></div>
    <div class="field-row">
      <div class="field"><label>Schriftgröße</label><select id="tsc">${TEXT_SCALES.map((s) => `<option value="${s}">${s}× – ${5 * s} px</option>`).join('')}</select></div>
      <div class="field"><label>Zeichenabstand</label><select id="tsp"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></div>
    </div>
    <p class="hint">Großbuchstaben, Ziffern, Umlaute und einfache Satzzeichen · Enter = neue Zeile · Farbe: Primärfarbe</p>
    <p class="hint">Schriftgröße = Höhe der Buchstaben im Bild · Zeichenabstand wächst mit der Schriftgröße · Kleinbuchstaben werden als Großbuchstaben gezeichnet.</p>`);
  body.querySelector('#tx').value = lastText;
  body.querySelector('#tsp').value = String(lastTextSpacing);
  body.querySelector('#tsc').value = String(lastTextScale);
  const ok = await modal({ title: 'Text einfügen', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Einfügen', value: true, primary: true }] });
  if (!ok) return;
  lastText = body.querySelector('#tx').value;
  lastTextSpacing = parseInt(body.querySelector('#tsp').value) || 0;
  lastTextScale = parseInt(body.querySelector('#tsc').value) || 1;
  const px = textPixels(lastText, lastTextSpacing, settings.primary, lastTextScale);
  if (!px) return;
  commitFloat(false);
  pushUndo();
  addRecent(settings.primary);
  float = { ...px, x: p.x, y: p.y, text: true }; // Text: nach dem Festsetzen keine Auswahl übrig lassen
  sel = null;
  requestRender();
  scheduleUI(true);
  toast('Text eingefügt – mit der Maus verschieben, Enter setzt ihn fest');
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
  if (float.text) keepSelection = false;
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
  toast(t('{n} Pixel ersetzt (Primär → Sekundär)', { n }));
}
/** Ersetzt eine Farbe in allen Ebenen und Frames (Doppelklick in der Live-Palette). */
async function replaceColorDialog(from) {
  // Neue Farbe: HEX eintippen/einfügen, eine Farbe aus dem Bild anklicken oder frei wählen
  const others = [...usedCounts.keys()].filter((c) => c !== from);
  const body = el(`
    <div class="rc-row">
      <div class="rc-side"><label>Alte Farbe</label><div class="rc-sw" style="background:${cssColor(from)}"></div><span class="mono">${toHex(from).toUpperCase()}</span></div>
      <div class="rc-arrow">→</div>
      <div class="rc-side"><label>Neue Farbe</label><div class="rc-sw" id="rc-prev" style="background:${cssColor(from)}"></div>
        <div class="rc-hexrow"><input type="text" id="rc-hex" class="mono" maxlength="7" spellcheck="false" value="${toHex(from).toUpperCase()}">
          <label class="icon-btn small rc-pick" title="Farbwähler"><svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.7 1.7-1.7H16c3.1 0 5.6-2.5 5.6-5.6C21.6 6 17.4 2 12 2z"/></svg><input type="color" id="rc-native" value="${toHex(from).slice(0, 7)}"></label>
        </div>
      </div>
    </div>
    ${others.length ? `<div class="field"><label>Farben im Bild – zum Übernehmen anklicken</label><div class="rc-colors">${others.map((c) => `<button type="button" class="rc-c" data-c="${c}" style="background:${cssColor(c)}" title="${toHex(c).toUpperCase()} · ${usedCounts.get(c) || 0} Pixel"></button>`).join('')}</div></div>` : ''}
    <p class="hint">${t('Betrifft')} ${usedCounts.get(from) || 0} ${t('Pixel in allen Ebenen und Frames. Die Deckkraft bleibt erhalten.')}</p>`);
  const hex = body.querySelector('#rc-hex'), nat = body.querySelector('#rc-native'), prev = body.querySelector('#rc-prev');
  let chosen = from;
  const show = (c, from_) => {
    chosen = c;
    prev.style.background = cssColor(c);
    if (from_ !== 'hex') hex.value = toHex(c).toUpperCase();
    if (from_ !== 'native') nat.value = toHex(c).slice(0, 7);
    hex.classList.remove('bad');
    body.querySelectorAll('.rc-c').forEach((b) => b.classList.toggle('active', +b.dataset.c === c));
  };
  hex.oninput = () => {
    const c = parseHex(hex.value.length === 6 && !hex.value.startsWith('#') ? '#' + hex.value : hex.value);
    if (c === null || !/^#?[0-9a-f]{6}$/i.test(hex.value.trim())) { hex.classList.add('bad'); return; }
    show(c, 'hex');
  };
  hex.onkeydown = (e) => e.stopPropagation(); // Strg+V usw. gehören dem Textfeld
  nat.oninput = () => show(parseHex(nat.value), 'native');
  body.querySelectorAll('.rc-c').forEach((b) => b.onclick = () => show(+b.dataset.c >>> 0));
  const ok = await modal({ title: 'Farbe überall ersetzen', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Ersetzen', value: true, primary: true }] });
  if (!ok) return;
  const [r, g, b] = unpack(chosen);
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
  toast(t('{n} Pixel umgefärbt', { n }));
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
      doc.layers.splice(cur.layer + 1, 0, { ...L, name: L.name + ' ' + t('Kopie'), frames: L.frames.map((f) => f.slice()) });
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
  while (doc.layers.some((l) => l.name === 'Ebene ' + i || l.name === 'Layer ' + i)) i++;
  return t('Ebene') + ' ' + i;
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
  scheduleGbCheck();
  markDirty();
  requestRender();
  scheduleUI(true);
}
function afterStructureChange() {
  scheduleGbCheck();
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

const thumbSrc = document.createElement('canvas');
/** Vorschaubild in Anzeigegröße zeichnen: kleine Bilder scharf vergrößern, große Bilder sauber verkleinern
 *  (sonst fallen beim Verkleinern ganze Pixelreihen weg und das Bild wirkt verzerrt). */
function thumbInto(c, drawFn, size) {
  const { w, h } = doc;
  thumbSrc.width = w; thumbSrc.height = h;
  const sctx = thumbSrc.getContext('2d');
  sctx.clearRect(0, 0, w, h);
  drawFn(sctx);
  const px = Math.round(size * (window.devicePixelRatio || 1));
  const fit = Math.min(px / w, px / h);
  const scale = fit >= 1 ? Math.floor(fit) : fit;
  const dw = Math.max(1, Math.round(w * scale)), dh = Math.max(1, Math.round(h * scale));
  c.width = dw; c.height = dh;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = scale < 1;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(thumbSrc, 0, 0, dw, dh);
  c.classList.toggle('smooth', scale < 1);
  const dpr = window.devicePixelRatio || 1;
  c.style.width = Math.min(size, dw / dpr) + 'px'; c.style.height = Math.min(size, dh / dpr) + 'px';
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
    thumbInto(c, (cc) => cc.putImageData(bufToImageData(L.frames[cur.frame], doc.w, doc.h), 0, 0), 30);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = layerLabel(L.name);
    name.dataset.i18nSkip = '';
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
    thumbInto(c, (cc) => drawComposite(cc, f), 68);
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
  $('#status-frame').textContent = `Frame ${cur.frame + 1}/${frameCount()} · ${layerLabel(doc.layers[cur.layer].name)}`;
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
  // Ganzes Bild zeigen: kleine Bilder ganzzahlig vergrößern, große Bilder passend verkleinern
  const fit = Math.min((box.clientWidth - 12) / doc.w, (box.clientHeight - 12) / doc.h);
  if (pv.w !== doc.w || pv.h !== doc.h) resetPreviewZoom();
  pv.base = fit >= 1 ? Math.floor(fit) : fit; // Bildschirm-Pixel pro Sprite-Pixel ohne Zoom
  if (pv.zoom > 1) { drawPreviewZoomed(box); return; }
  previewCanvas.classList.remove('zoomed');
  const s = fit >= 1 ? Math.floor(fit) : 1;
  if (previewCanvas.width !== doc.w * s || previewCanvas.height !== doc.h * s) {
    previewCanvas.width = doc.w * s; previewCanvas.height = doc.h * s;
  }
  const cssW = fit >= 1 ? doc.w * s : Math.max(1, Math.floor(doc.w * fit));
  const cssH = fit >= 1 ? doc.h * s : Math.max(1, Math.floor(doc.h * fit));
  if (previewCanvas.style.width !== cssW + 'px' || previewCanvas.style.height !== cssH + 'px') {
    previewCanvas.style.width = cssW + 'px'; previewCanvas.style.height = cssH + 'px';
    previewCanvas.classList.toggle('smooth', fit < 1);
  }
  if (comp.width !== doc.w || comp.height !== doc.h) { comp.width = doc.w; comp.height = doc.h; }
  const c = compositeCanvas(Math.min(previewFrame, frameCount() - 1));
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.drawImage(c, 0, 0, previewCanvas.width, previewCanvas.height);
}

/* ---------- Vorschau-Zoom ----------
   Mausrad über der Vorschau zoomt zur Mausposition, Ziehen verschiebt den Ausschnitt,
   Doppelklick (oder Klick auf die Zoom-Anzeige) zeigt wieder das ganze Bild. */
const pv = { zoom: 1, cx: 0, cy: 0, w: 0, h: 0, base: 1, drag: null };
const PV_ZOOMS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32];
function resetPreviewZoom() {
  pv.zoom = 1; pv.cx = doc.w / 2; pv.cy = doc.h / 2; pv.w = doc.w; pv.h = doc.h;
  const lbl = $('#preview-zoom');
  if (lbl) lbl.hidden = true;
  previewLast = 0;
}
function clampPreviewCenter() {
  pv.cx = clamp(pv.cx, 0, doc.w); pv.cy = clamp(pv.cy, 0, doc.h);
}
function drawPreviewZoomed(box) {
  const dpr = window.devicePixelRatio || 1;
  const W = box.clientWidth, H = box.clientHeight;
  if (previewCanvas.width !== Math.round(W * dpr) || previewCanvas.height !== Math.round(H * dpr)) {
    previewCanvas.width = Math.round(W * dpr); previewCanvas.height = Math.round(H * dpr);
  }
  if (previewCanvas.style.width !== W + 'px' || previewCanvas.style.height !== H + 'px') {
    previewCanvas.style.width = W + 'px'; previewCanvas.style.height = H + 'px';
  }
  previewCanvas.classList.remove('smooth');
  previewCanvas.classList.add('zoomed');
  if (comp.width !== doc.w || comp.height !== doc.h) { comp.width = doc.w; comp.height = doc.h; }
  const c = compositeCanvas(Math.min(previewFrame, frameCount() - 1));
  const k = pv.base * pv.zoom * dpr;
  pctx.setTransform(1, 0, 0, 1, 0, 0);
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.setTransform(k, 0, 0, k, previewCanvas.width / 2 - pv.cx * k, previewCanvas.height / 2 - pv.cy * k);
  pctx.drawImage(c, 0, 0);
  pctx.setTransform(1, 0, 0, 1, 0, 0);
}
function setPreviewZoom(z, mx, my) {
  const box = previewCanvas.parentElement;
  const old = pv.base * pv.zoom;
  // Punkt unter der Maus (in Sprite-Pixeln) – ohne Zoom liegt das Bild mittig in der Box
  if (mx !== undefined && pv.zoom > 1) {
    const px = pv.cx + (mx - box.clientWidth / 2) / old, py = pv.cy + (my - box.clientHeight / 2) / old;
    pv.zoom = z;
    const nk = pv.base * pv.zoom;
    pv.cx = px - (mx - box.clientWidth / 2) / nk; pv.cy = py - (my - box.clientHeight / 2) / nk;
  } else if (mx !== undefined) {
    const r = previewCanvas.getBoundingClientRect(), b = box.getBoundingClientRect();
    pv.cx = clamp((mx - (r.left - b.left)) / old, 0, doc.w);
    pv.cy = clamp((my - (r.top - b.top)) / old, 0, doc.h);
    pv.zoom = z;
  } else pv.zoom = z;
  if (pv.zoom <= 1) return resetPreviewZoom();
  clampPreviewCenter();
  const lbl = $('#preview-zoom');
  lbl.hidden = false;
  lbl.textContent = (Number.isInteger(pv.zoom) ? pv.zoom : pv.zoom.toFixed(1)) + '×';
  previewLast = 0;
}
(function initPreviewZoom() {
  const box = previewCanvas.parentElement;
  box.addEventListener('wheel', (e) => {
    e.preventDefault();
    const b = box.getBoundingClientRect();
    let i = PV_ZOOMS.findIndex((z) => z >= pv.zoom);
    if (i < 0) i = PV_ZOOMS.length - 1;
    i = clamp(i + (e.deltaY < 0 ? 1 : -1), 0, PV_ZOOMS.length - 1);
    setPreviewZoom(PV_ZOOMS[i], e.clientX - b.left, e.clientY - b.top);
  }, { passive: false });
  box.addEventListener('pointerdown', (e) => {
    if (pv.zoom <= 1 || e.button !== 0) return;
    pv.drag = { x: e.clientX, y: e.clientY, cx: pv.cx, cy: pv.cy };
    box.setPointerCapture(e.pointerId);
    box.classList.add('dragging');
  });
  box.addEventListener('pointermove', (e) => {
    if (!pv.drag) return;
    const k = pv.base * pv.zoom;
    pv.cx = pv.drag.cx - (e.clientX - pv.drag.x) / k;
    pv.cy = pv.drag.cy - (e.clientY - pv.drag.y) / k;
    clampPreviewCenter();
    previewLast = 0;
  });
  const end = () => { pv.drag = null; box.classList.remove('dragging'); };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  box.addEventListener('dblclick', resetPreviewZoom);
  $('#preview-zoom').addEventListener('click', resetPreviewZoom);
})();

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
  const addOption = (parent, value, text) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    if (value === settings.paletteName) o.selected = true;
    parent.appendChild(o);
    return o;
  };
  addOption(sel, USED, '★ Benutzte Farben (live)');
  const gPre = document.createElement('optgroup');
  gPre.label = 'Vorlagen';
  for (const name of Object.keys(PALETTES)) addOption(gPre, name, name);
  sel.appendChild(gPre);
  const gOwn = document.createElement('optgroup');
  gOwn.label = t('Eigene Paletten ({n}/{max})', { n: customPalettes.length, max: MAX_CUSTOM_PALETTES });
  for (const c of customPalettes) addOption(gOwn, CUSTOM_PREFIX + c.id, `${c.name} (${c.colors.length})`).dataset.i18nSkip = '';
  if (!customPalettes.length) {
    const o = document.createElement('option');
    o.disabled = true;
    o.textContent = 'Noch keine';
    gOwn.appendChild(o);
  }
  sel.appendChild(gOwn);
  const own = isCustomPalette();
  $('#pal-rename').disabled = !own;
  $('#pal-delete').disabled = !own;
  if (!live) {
    $('#palette-hint').textContent = own
      ? 'Klick: Primär · Rechtsklick: Sekundär · Strg+Klick: entfernen'
      : 'Klick: Primär · Rechtsklick: Sekundär · Ändern legt eine eigene Kopie an';
    if (own && !settings.palette.length) box.innerHTML = '<p class="hint palette-empty">Leer – füge mit + die Primärfarbe hinzu oder übernimm Farben aus dem Bild.</p>';
  }
  updateColorUI();
}
/* ---------- Eigene Paletten (mehrere, mit Namen) ---------- */
const MAX_CUSTOM_PALETTES = 20;
const CUSTOM_PREFIX = 'custom:';
let customPalettes = []; // [{ id, name, colors: [u32] }]

function loadCustomPalettes() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem('pixelbro.customPalettes') || 'null'); } catch (e) { stored = null; }
  customPalettes = Array.isArray(stored) ? stored : [];
  // Übernahme der alten einzelnen „Eigene Palette“ (vor 1.2.0) – nur ein einziges Mal:
  // nur wenn es die neue Liste noch gar nicht gibt, danach wird die alte Palette gelöscht.
  // (Bis 1.2.3 lief das bei jeder leeren Liste – gelöschte Paletten kamen beim Neustart zurück.)
  if (stored === null) {
    try {
      const old = JSON.parse(localStorage.getItem('pixelbro.customPalette') || 'null');
      if (Array.isArray(old) && old.length) customPalettes.push({ id: newPaletteId(), name: 'Eigene Palette 1', colors: old });
    } catch (e) { /* ignorieren */ }
  }
  try { localStorage.removeItem('pixelbro.customPalette'); } catch (e) { /* ignorieren */ }
  customPalettes = customPalettes.filter((c) => c && c.id && Array.isArray(c.colors));
  saveCustomPalettes();
}
function saveCustomPalettes() {
  try { localStorage.setItem('pixelbro.customPalettes', JSON.stringify(customPalettes)); } catch (e) { /* ignorieren */ }
}
function newPaletteId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
const isCustomPalette = (name = settings.paletteName) => String(name).startsWith(CUSTOM_PREFIX);
const currentCustom = () => customPalettes.find((c) => CUSTOM_PREFIX + c.id === settings.paletteName) || null;
function nextPaletteName() {
  let i = customPalettes.length + 1;
  while (customPalettes.some((c) => c.name === t('Eigene Palette') + ' ' + i)) i++;
  return t('Eigene Palette') + ' ' + i;
}
function selectPalette(name) {
  settings.paletteName = name;
  if (name === USED) { refreshUsedPalette(true); saveSettings(); return; }
  const custom = currentCustom();
  if (custom) settings.palette = custom.colors.slice();
  else if (PALETTES[name]) settings.palette = PALETTES[name].map(parseHex);
  else { settings.paletteName = 'Bro 32'; settings.palette = PALETTES['Bro 32'].map(parseHex); }
  renderPalette();
  saveSettings();
}
/** Legt eine neue eigene Palette an und wählt sie aus. Gibt null zurück, wenn das Limit erreicht ist. */
function createCustomPalette(name, colors) {
  if (customPalettes.length >= MAX_CUSTOM_PALETTES) {
    toast(t('Maximal {max} eigene Paletten – lösch eine, um Platz zu machen', { max: MAX_CUSTOM_PALETTES }));
    return null;
  }
  const pal = { id: newPaletteId(), name: (name || '').trim() || nextPaletteName(), colors: colors.slice() };
  customPalettes.push(pal);
  saveCustomPalettes();
  selectPalette(CUSTOM_PREFIX + pal.id);
  return pal;
}
/** Nach einer Änderung an settings.palette: eigene Palette speichern – bei Vorlagen eine eigene Kopie anlegen. */
function paletteEdited() {
  const custom = currentCustom();
  if (custom) {
    custom.colors = settings.palette.slice();
    saveCustomPalettes();
    renderPalette();
    saveSettings();
    return;
  }
  const pal = createCustomPalette(nextPaletteName(), settings.palette);
  if (pal) toast(t('Eigene Kopie „{name}“ angelegt – die Vorlage bleibt unverändert', { name: pal.name }));
  else selectPalette(settings.paletteName); // Änderung verwerfen
}
async function askPaletteName(title, value, actions) {
  const body = el(`<div class="field"><label>Name der Palette</label><input type="text" id="pal-name" maxlength="40"></div>`);
  body.querySelector('#pal-name').value = value;
  const res = await modal({ title, body, actions: actions || [{ label: 'Abbrechen', value: false }, { label: 'OK', value: true, primary: true }] });
  if (!res) return null;
  return { action: res, name: body.querySelector('#pal-name').value.trim() || value };
}
async function newPaletteDialog() {
  if (customPalettes.length >= MAX_CUSTOM_PALETTES) return createCustomPalette('', []);
  const r = await askPaletteName('Neue Palette', nextPaletteName(), [{ label: 'Abbrechen', value: false }, { label: 'Anlegen', value: true, primary: true }]);
  if (!r) return;
  const pal = createCustomPalette(r.name, []);
  if (pal) toast(t('„{name}“ angelegt – füge mit + die Primärfarbe hinzu oder übernimm Farben aus dem Bild', { name: pal.name }));
}
async function renamePaletteDialog() {
  const custom = currentCustom();
  if (!custom) return toast('Nur eigene Paletten lassen sich umbenennen');
  const r = await askPaletteName('Palette umbenennen', custom.name, [{ label: 'Abbrechen', value: false }, { label: 'Umbenennen', value: true, primary: true }]);
  if (!r) return;
  custom.name = r.name;
  saveCustomPalettes();
  renderPalette();
}
async function deletePaletteDialog() {
  const custom = currentCustom();
  if (!custom) return toast('Nur eigene Paletten lassen sich löschen');
  const body = el('<p data-i18n-skip></p>');
  body.firstChild.textContent = t('Die Palette {name} mit {n} Farben wird gelöscht. Deine Bilder bleiben unverändert.', { name: `„${custom.name}“`, n: custom.colors.length });
  const ok = await modal({ title: 'Palette löschen?', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Löschen', value: true, primary: true }] });
  if (!ok) return;
  customPalettes = customPalettes.filter((c) => c !== custom);
  saveCustomPalettes();
  selectPalette('Bro 32');
  toast(t('„{name}“ gelöscht', { name: custom.name }));
}
async function paletteFromImageDialog() {
  const set = new Set();
  for (const L of doc.layers) for (const f of L.frames) for (const u of f) if (u >>> 24) set.add(u);
  if (!set.size) return toast('Das Bild enthält noch keine Farben');
  if (set.size > 256) return toast(t('Zu viele Farben ({n}) – maximal 256', { n: set.size }));
  const colors = [...set].sort((a, b) => rgbToHsl(...unpack(a).slice(0, 3))[0] - rgbToHsl(...unpack(b).slice(0, 3))[0]);
  const custom = currentCustom();
  const defName = fileInfo.name && fileInfo.name !== 'unbenannt' ? baseName() : nextPaletteName();
  const actions = [{ label: 'Abbrechen', value: false }];
  if (custom) actions.push({ label: t('„{name}“ ersetzen', { name: custom.name }), value: 'replace' });
  actions.push({ label: 'Als neue Palette', value: 'new', primary: true });
  const r = await askPaletteName(t('{n} Farben aus dem Bild übernehmen', { n: set.size }), defName, actions);
  if (!r) return;
  if (r.action === 'replace' && custom) {
    custom.colors = colors;
    custom.name = r.name;
    saveCustomPalettes();
    selectPalette(CUSTOM_PREFIX + custom.id);
    toast(t('„{name}“ mit {n} Farben ersetzt', { name: custom.name, n: set.size }));
  } else {
    const pal = createCustomPalette(r.name, colors);
    if (pal) toast(t('Neue Palette „{name}“ mit {n} Farben', { name: pal.name, n: set.size }));
  }
}
/** Projektpalette beim Öffnen: passende Palette auswählen oder als eigene Palette anlegen. */
function adoptProjectPalette(colors, projectName) {
  if (!colors.length || isLivePalette()) return;
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const custom = customPalettes.find((c) => same(c.colors, colors));
  if (custom) return selectPalette(CUSTOM_PREFIX + custom.id);
  const preset = Object.keys(PALETTES).find((k) => same(PALETTES[k].map(parseHex), colors));
  if (preset) return selectPalette(preset);
  if (customPalettes.length < MAX_CUSTOM_PALETTES) createCustomPalette(t('Projekt') + ' ' + projectName.replace(/\.[^.]+$/, ''), colors);
}

/* ---------- GB-Studio-Prüfung (Game Boy Color / Game Boy klassisch) ----------
   Game Boy Color: Hintergründe bestehen aus 8×8-Kacheln, jede Kachel nutzt genau eine Palette mit 4 Farben.
     7 Paletten sind frei, die 8. ist für Text/UI reserviert. Die Farben werden zu möglichst wenigen
     4er-Paletten zusammengefasst. Dazu: verschiedene Kacheln (max. 384).
   Game Boy (klassisch): nur die 4 Grüntöne erlaubt (bei Sprites zusätzlich #65FF00 als Transparenz),
     verschiedene Kacheln (max. 192). Fremde Farben werden markiert und gezählt. */
const GB_TILE = 8, GB_COLORS = 4, GB_MAX_PALETTES = 7;
const GB_TILE_LIMIT = { color: 384, classic: 192 };
const GB_CLASSIC_COLORS = ['e0f8cf', '86c06c', '306850', '071821'].map(parseHex);
const GB_SPRITE_TRANSPARENT = parseHex('65ff00');
const GB_HUES = ['#7c5cff', '#22c3e6', '#3ddc84', '#ffb020', '#ff5ca8', '#a0e000', '#ff7a45', '#4f8bff', '#c58cff', '#00d0a0'];
const gbView = { on: false, result: null, timer: null, filter: -1 }; // filter: nur diese Palette im Bild zeigen (-1 = alle)
const pl = (n, one, many, vars = {}) => t(n === 1 ? one : many, { n, ...vars });
const gbMode = () => (settings.gbMode === 'classic' ? 'classic' : 'color');

/* GB Studio rechnet Farben vor dem Einteilen in die echten GBC-Farben um (Farbkorrektur „Standard“,
   lib/color/reverseColorCorrection.ts). Zwei Farben, die dabei gleich werden, zählen als eine. */
let gbcLut = null;
const gbcCanonCache = new Map();
function gbcCanonical(u) {
  const [r, g, b] = unpack(u);
  const key = (r << 16) | (g << 8) | b;
  if (gbcCanonCache.has(key)) return gbcCanonCache.get(key);
  if (!gbcLut) {
    gbcLut = new Map();
    for (let R = 0; R < 32; R++) for (let G = 0; G < 32; G++) for (let B = 0; B < 32; B++) {
      const corrected = ((((R * 13 + G * 2 + B) >> 1) << 16) | ((G * 3 + B) << 9) | ((R * 3 + G * 2 + B * 11) >> 1)) >>> 0;
      gbcLut.set(corrected, (R << 10) | (G << 5) | B);
    }
  }
  let res = gbcLut.get(key);
  if (res === undefined) {
    let bd = Infinity;
    for (const [c2, raw] of gbcLut) {
      const dr = r - ((c2 >> 16) & 255), dg = g - ((c2 >> 8) & 255), db = b - (c2 & 255);
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; res = raw; }
    }
  }
  gbcCanonCache.set(key, res);
  return res;
}

/* Verschiedene Kacheln wie GB Studio zählen (compileImages.ts, autoColor.ts, autoFlip.ts):
   - Eine Kachel speichert nur Farbnummern 0–3. Gleiches Muster mit anderer Palette = dieselbe Kachel.
   - Die Farbnummer kommt aus der Palette, die GB Studio der Kachel gibt (nach Helligkeit einsortiert,
     fillVariablePalette); Farben, die nicht drin sind, nehmen die ähnlichste.
   - Im Farbmodus erkennt GB Studio gespiegelte Kacheln (waagerecht, senkrecht, beides) – „Auto Tile Flip“.
   - Nur ganze 8×8-Kacheln zählen (Reste am Rand schneidet GB Studio ab). */
// Palette 8 (Text/UI): so, wie GB Studio die Farben anzeigt („Hex-Farbe“). Vorgabe-UI von GB Studio:
const GB_UI_DEFAULT = ['f4e8cc', '9ac8bd', '4f6c6d', '0f2a37'];
const gbUiDisplay = () => (Array.isArray(settings.gbUi) && settings.gbUi.length === 4 && settings.gbUi.every((h) => parseHex(h)) ? settings.gbUi : GB_UI_DEFAULT).map((h) => h.replace('#', '').toLowerCase());
const gbUiRaw = () => gbUiDisplay().map((h) => gbcHex(parseHex('#' + h)));
const GB_EMPTY_PALETTE = ['f8f8f8', 'a0a0a0', '585858', '080808'];
function gbcHex(u) {
  if (!u) return '000000';
  const raw = gbcCanonical(u);
  return [(raw >> 10) & 31, (raw >> 5) & 31, raw & 31].map((v) => Math.round((v / 31) * 255).toString(16).padStart(2, '0')).join('');
}
function hexLabL(hex) {
  const v = [0, 2, 4].map((i) => { const c = parseInt(hex.substr(i, 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const y = 0.2126729 * v[0] + 0.7151522 * v[1] + 0.072175 * v[2];
  return 116 * (y > 0.008856452 ? Math.cbrt(y) : y / 0.12841855 + 0.137931034) - 16;
}
const hexDist = (a, b) => [0, 2, 4].reduce((s2, i) => s2 + Math.abs(parseInt(a.substr(i, 2), 16) - parseInt(b.substr(i, 2), 16)), 0);
function gbsFillPalette(hexes) {
  const A = [100, 66, 33, 0];
  const slot = (hex) => { const g = parseInt(hex.substr(2, 2), 16); return g < 65 ? 3 : g < 130 ? 2 : g < 205 ? 1 : 0; };
  const colors = hexes.map((hex) => ({ hex, l: hexLabL(hex) })).sort((a, b) => b.l - a.l)
    .map((c2) => ({ ...c2, index: slot(c2.hex) })).sort((a, b) => a.index - b.index);
  const res = [undefined, undefined, undefined, undefined], overflow = [];
  for (let i = 0; i < colors.length;) {
    const s2 = colors[i].index, start = i;
    while (i < colors.length && colors[i].index === s2) i++;
    const group = colors.slice(start, i).sort((a, b) => Math.abs(a.l - A[s2]) - Math.abs(b.l - A[s2]));
    if (res[s2] === undefined) res[s2] = group[0].hex; else overflow.push(group[0]);
    overflow.push(...group.slice(1));
  }
  overflow.sort((a, b) => Math.abs(a.l - A[a.index]) - Math.abs(b.l - A[b.index]));
  for (const c2 of overflow) {
    let k = -1;
    for (let i = c2.index + 1; i < 4 && k < 0; i++) if (res[i] === undefined) k = i;
    for (let i = c2.index - 1; i >= 0 && k < 0; i--) if (res[i] === undefined) k = i;
    if (k >= 0) res[k] = c2.hex;
  }
  return res.map((x) => x || '000000');
}
// Paletten so, wie GB Studio sie ablegt (setUIPalette): Platz = Nummer % 8. Ab 8 Paletten braucht GB Studio
// Platz 8 für die Text-/UI-Palette: die Palette unter den ersten 7, die ihr am ähnlichsten ist, bekommt deren Farben,
// Palette 8 rückt auf ihren Platz. replaced = diese Palette (sonst -1).
function gbsSlots(palettes) {
  let pals = palettes.map((p) => gbsFillPalette([...new Set(p.map(gbcHex))]));
  let slotOf = (i) => i % 8, replaced = -1;
  const ui = gbUiRaw();
  if (pals.length < 8) {
    pals = pals.slice(0, 7);
    while (pals.length < 7) pals.push(GB_EMPTY_PALETTE);
    pals.push(ui);
  } else {
    let ri = 0, best = Infinity;
    for (let i = 0; i <= Math.min(6, pals.length - 1); i++) {
      const d = [0, 1, 2, 3].reduce((s2, k) => s2 + hexDist(pals[i][k], ui[k]), 0);
      if (d < best) { best = d; ri = i; }
    }
    const at7 = pals[7];
    pals = pals.slice(0, 8); pals[ri] = at7; pals[7] = ui;
    slotOf = (i) => { const m = i % 8; return m === ri ? 7 : m === 7 ? ri : m; };
    replaced = ri;
  }
  return { pals, slotOf, replaced };
}
function gbsTileCount(tiles, slots, cols, rows, w, h) {
  const { pals, slotOf } = slots;
  const fullCols = Math.floor(w / GB_TILE), fullRows = Math.floor(h / GB_TILE);
  const plain = new Set(), flipped = new Set();
  let flip = 0;
  const N = GB_TILE;
  for (let ty = 0; ty < fullRows; ty++) for (let tx = 0; tx < fullCols; tx++) {
    const tile = tiles[ty * cols + tx];
    const pal = pals[slotOf(Math.max(0, tile.gbs))];
    const cache = new Map();
    const idx = tile.pixels.map((u) => {
      if (cache.has(u)) return cache.get(u);
      const hex = gbcHex(u);
      let bi = 0, bd = Infinity;
      pal.forEach((c2, i) => { const d = hexDist(hex, c2); if (d < bd) { bd = d; bi = i; } });
      cache.set(u, bi);
      return bi;
    });
    const key = (fx, fy) => { let k = ''; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) k += idx[(fy ? N - 1 - y : y) * N + (fx ? N - 1 - x : x)]; return k; };
    const k0 = key(false, false);
    plain.add(k0);
    if (![k0, key(true, false), key(false, true), key(true, true)].some((k) => flipped.has(k))) { flipped.add(k0); flip++; }
  }
  return { plain: plain.size, flip };
}

// Wie viele Paletten bildet GB Studio, wenn Farbe from durch to ersetzt wird? (für geprüfte Tausch-Vorschläge)
function gbsPaletteCount(tiles, from, to) {
  const seen = new Set(), sets = [];
  for (const tile of tiles) {
    const first = [];
    for (let u of tile.pixels) { if (u === from) u = to; if (u && !first.includes(u)) { first.push(u); if (first.length === GB_COLORS) break; } }
    if (!first.length) continue;
    const key = first.slice().sort().join(',');
    if (!seen.has(key)) { seen.add(key); sets.push(first); }
  }
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < sets.length && !merged; i++) for (let j = i + 1; j < sets.length; j++) {
      const u = [...new Set([...sets[i], ...sets[j]])];
      if (u.length <= GB_COLORS) { sets[i] = u; sets.splice(j, 1); merged = true; break; }
    }
  }
  return sets.length;
}

const gbClassicSlot = (g) => (g < 65 ? 3 : g < 130 ? 2 : g < 205 ? 1 : 0);

/** Farben im ganzen Dokument tauschen (alle Ebenen und Frames, Deckkraft bleibt). map: Farbe (deckend) → neue Farbe */
function gbRecolor(map) {
  commitFloat(false);
  pushUndo();
  let n = 0;
  for (const L of doc.layers) for (const f of L.frames) for (let i = 0; i < f.length; i++) {
    const u = f[i];
    if (!(u >>> 24)) continue;
    const to = map.get((u | 0xff000000) >>> 0);
    if (to === undefined) continue;
    const v = ((to & 0x00ffffff) | (u & 0xff000000)) >>> 0;
    if (v !== u) { f[i] = v; n++; }
  }
  for (const k of ['primary', 'secondary']) { const to = map.get(settings[k] >>> 0); if (to !== undefined) settings[k] = to; }
  afterPaint();
  updateColorUI();
  return n;
}

/** Überzählige Pixel (Kacheln mit mehr als 4 Farben) so umfärben, wie GB Studio es tut: ähnlichste Farbe der Kachel-Palette */
function gbFixExtraPixels(r) {
  commitFloat(false);
  pushUndo();
  let n = 0;
  const near = (u, list) => { const [a, b, c] = unpack(u); let best = list[0], bd = Infinity; for (const v of list) { const [x, y, z] = unpack(v); const d = Math.abs(a - x) + Math.abs(b - y) + Math.abs(c - z); if (d < bd) { bd = d; best = v; } } return best; };
  for (const tile of r.bad) {
    if (!tile.keep || !tile.keep.length) continue;
    tile.pixels.forEach((u, k) => {
      if (!u || tile.keep.includes(u)) return;
      const x = tile.tx * GB_TILE + (k % GB_TILE), y = tile.ty * GB_TILE + Math.floor(k / GB_TILE);
      if (x >= doc.w || y >= doc.h) return;
      const to = near(u, tile.keep), i = y * doc.w + x;
      for (let li = doc.layers.length - 1; li >= 0; li--) {
        const L = doc.layers[li];
        if (!L.visible) continue;
        const f = L.frames[cur.frame], v = f[i];
        if (!(v >>> 24)) continue;
        f[i] = ((to & 0x00ffffff) | (v & 0xff000000)) >>> 0; n++;
        break;
      }
    });
  }
  afterPaint();
  updateColorUI();
  return n;
}

function gbAnalyze() {
  const mode = gbMode();
  const { w, h } = doc;
  const c = compositeCanvas(cur.frame, false);
  const px = new Uint32Array(c.getContext('2d').getImageData(0, 0, w, h).data.buffer);
  const cols = Math.ceil(w / GB_TILE), rows = Math.ceil(h / GB_TILE);
  const solidRaw = (u) => ((u >>> 24) ? (u | 0xff000000) >>> 0 : 0); // Deckkraft spielt keine Rolle, 0 = transparent
  const repOf = new Map(), repByCanon = new Map();
  const solid = mode === 'classic' ? solidRaw : (u) => {
    u = solidRaw(u);
    if (!u) return 0;
    let rep = repOf.get(u);
    if (rep === undefined) {
      const k = gbcCanonical(u);
      rep = repByCanon.get(k);
      if (rep === undefined) { rep = u; repByCanon.set(k, u); }
      repOf.set(u, rep);
    }
    return rep;
  };
  const tiles = [];
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const set = new Set(), pixels = [];
    for (let y = ty * GB_TILE; y < ty * GB_TILE + GB_TILE; y++) {
      for (let x = tx * GB_TILE; x < tx * GB_TILE + GB_TILE; x++) {
        const u = x < w && y < h ? solid(px[y * w + x]) : 0;
        pixels.push(u);
        if (u) set.add(u);
      }
    }
    tiles.push({ tx, ty, colors: [...set], pixels, palette: -1 });
  }
  const res = { solid, mode, tiles, cols, rows, partial: w % GB_TILE !== 0 || h % GB_TILE !== 0, tileLimit: GB_TILE_LIMIT[mode] };

  if (mode === 'classic') {
    // Wie GB Studio (tileDataIndexFn): Der klassische Game Boy kennt nur 4 Stufen. GB Studio schaut nur auf den
    // Grünanteil: ab 205 hellste, ab 130 hell, ab 65 dunkel, darunter dunkelste Farbe. Genaue HEX-Codes sind egal.
    // Problem ist nur: eine Farbe liegt direkt an einer Grenze (rutscht leicht in die falsche Stufe) oder
    // zwei deutlich verschiedene Farben landen in derselben Stufe (werden im Spiel gleich).
    const allowed = new Set(GB_CLASSIC_COLORS);
    if (settings.gbSprite) allowed.add(GB_SPRITE_TRANSPARENT);
    const count = new Map();
    for (let i = 0; i < px.length; i++) { const u = solid(px[i]); if (u) count.set(u, (count.get(u) || 0) + 1); }
    const info = new Map();
    for (const u of count.keys()) {
      if (allowed.has(u)) { info.set(u, { slot: u === GB_SPRITE_TRANSPARENT ? -1 : GB_CLASSIC_COLORS.indexOf(u), exact: true }); continue; }
      const g = unpack(u)[1];
      const slot = gbClassicSlot(g);
      const edge = [65, 130, 205].some((th) => Math.abs(g - th) <= 6);
      info.set(u, { slot, exact: false, edge, target: GB_CLASSIC_COLORS[slot] });
    }
    // Deutlich verschiedene Farben in derselben Stufe?
    const bySlot = new Map();
    for (const [u, f] of info) if (f.slot >= 0) { if (!bySlot.has(f.slot)) bySlot.set(f.slot, []); bySlot.get(f.slot).push(u); }
    for (const list of bySlot.values()) {
      if (list.length < 2) continue;
      for (const a of list) for (const b of list) {
        if (a === b) continue;
        const A = unpack(a), B = unpack(b);
        if (Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2])) > 40) {
          const f = info.get(a); if (!f.exact) { f.merge = b; }
        }
      }
    }
    const foreign = [], mapped = [], bad = new Set();
    for (const [u, f] of info) {
      if (f.exact) continue;
      const entry = { u, n: count.get(u), target: f.target, edge: f.edge, merge: f.merge };
      if (f.edge || f.merge) { foreign.push(entry); bad.add(u); } else mapped.push(entry);
    }
    foreign.sort((a, b) => b.n - a.n); mapped.sort((a, b) => b.n - a.n);
    res.foreign = foreign.map((e) => [e.u, e.n]);
    res.foreignInfo = foreign;
    res.mapped = mapped;
    res.foreignPixels = [];
    if (bad.size) for (let i = 0; i < px.length; i++) if (bad.has(solid(px[i]))) res.foreignPixels.push(i);
    for (const tile of tiles) tile.foreign = tile.colors.some((u) => bad.has(u));
    // Kacheln zählen wie GB Studio: nach Stufe (Farbnummer), ohne Spiegeln (gibt es nur im Farbmodus)
    const slotKey = (u) => (u ? (info.get(u).slot < 0 ? 0 : info.get(u).slot) : 0);
    const fc = Math.floor(w / GB_TILE), fr = Math.floor(h / GB_TILE);
    const keys = new Set();
    for (let ty = 0; ty < fr; ty++) for (let tx = 0; tx < fc; tx++) keys.add(tiles[ty * cols + tx].pixels.map(slotKey).join(''));
    res.uniqueTiles = keys.size;
    res.ok = !res.foreignPixels.length && res.uniqueTiles <= res.tileLimit;
    return res;
  }

  const bad = tiles.filter((tile) => tile.colors.length > GB_COLORS);
  // Paletten genau so bilden wie GB Studio im Modus „Automatisch“ (autoColor.ts):
  // 1. pro Kachel die ersten 4 Farben in Lese-Reihenfolge, gleiche Farbsets nur einmal (Reihenfolge des ersten Auftretens)
  // 2. immer das erste Paar zusammenlegen, das zusammen höchstens 4 Farben hat – so lange, bis nichts mehr geht
  // Das ist nicht immer die kleinstmögliche Aufteilung – aber genau die, die GB Studio benutzt.
  const seenSets = new Set();
  const gbsSets = [];
  for (const tile of tiles) {
    const first = [];
    for (const u of tile.pixels) if (u && !first.includes(u)) { first.push(u); if (first.length === GB_COLORS) break; }
    if (!first.length) continue;
    const key = first.slice().sort().join(',');
    tile.setKey = key;
    if (!seenSets.has(key)) { seenSets.add(key); gbsSets.push(first); }
  }
  const palettes = gbsSets.map((p) => p.slice());
  const origins = gbsSets.map((p) => [p.slice().sort().join(',')]);
  for (let merged = true; merged;) {
    merged = false;
    for (let i = 0; i < palettes.length && !merged; i++) {
      for (let j = i + 1; j < palettes.length; j++) {
        const u = [...new Set([...palettes[i], ...palettes[j]])];
        if (u.length <= GB_COLORS) {
          palettes[i] = u; origins[i] = origins[i].concat(origins[j]);
          palettes.splice(j, 1); origins.splice(j, 1); merged = true; break;
        }
      }
    }
  }
  // Welche Palette GB Studio jeder Kachel wirklich gibt
  const gbsOf = new Map();
  origins.forEach((keys, i) => keys.forEach((k) => gbsOf.set(k, i)));
  for (const tile of tiles) tile.gbs = tile.setKey !== undefined ? gbsOf.get(tile.setKey) : -1;
  const light = (u) => { const [r, g, b] = unpack(u); return r * 0.299 + g * 0.587 + b * 0.114; };
  palettes.forEach((p) => p.sort((a, b) => light(b) - light(a))); // hell → dunkel wie in GB Studio
  // Zuordnung Kachel → Palette. Passt eine Kachel in mehrere Paletten (z. B. nur Weiß + Dunkel),
  // bekommt sie die Palette ihrer Nachbarn – so zeigt das Bild, was beim Zeichnen gemeint war.
  // tile.multi = true: Die Kachel würde auch in andere Paletten passen (Anzeige „6+“).
  for (const tile of tiles) {
    tile.candidates = (!tile.colors.length || tile.colors.length > GB_COLORS) ? []
      : palettes.map((p, i) => (tile.colors.every((c2) => p.includes(c2)) ? i : -1)).filter((i) => i >= 0);
    tile.multi = tile.candidates.length > 1;
    tile.palette = tile.candidates.length === 1 ? tile.candidates[0] : -1;
  }
  const at = (tx, ty) => (tx >= 0 && ty >= 0 && tx < cols && ty < rows ? tiles[ty * cols + tx] : null);
  const NB = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const tile of tiles) {
      if (!tile.multi) continue;
      const votes = new Map();
      NB.forEach(([dx, dy], k) => {
        const n = at(tile.tx + dx, tile.ty + dy);
        if (!n || n.palette < 0 || !tile.candidates.includes(n.palette)) return;
        // Wie viele Pixel laufen über die gemeinsame Kante mit derselben Farbe weiter? (zählt am meisten)
        let flow = 0;
        if (k < 4) for (let i = 0; i < GB_TILE; i++) {
          const a = dx ? tile.pixels[i * GB_TILE + (dx > 0 ? GB_TILE - 1 : 0)] : tile.pixels[(dy > 0 ? GB_TILE - 1 : 0) * GB_TILE + i];
          const b = dx ? n.pixels[i * GB_TILE + (dx > 0 ? 0 : GB_TILE - 1)] : n.pixels[(dy > 0 ? 0 : GB_TILE - 1) * GB_TILE + i];
          if (a && a === b) flow++;
        }
        votes.set(n.palette, (votes.get(n.palette) || 0) + flow * 3 + (k < 4 ? 2 : 1) + (n.multi ? 0 : 1));
      });
      if (!votes.size) continue;
      const best = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
      if (best !== tile.palette) { tile.palette = best; changed = true; }
    }
    if (!changed) break;
  }
  // Ohne passende Nachbarn: die Palette, die sonst am häufigsten vorkommt
  const firm = palettes.map(() => 0);
  for (const tile of tiles) if (tile.palette >= 0) firm[tile.palette]++;
  for (const tile of tiles) {
    if (tile.multi && tile.palette < 0) tile.palette = tile.candidates.slice().sort((a, b) => firm[b] - firm[a] || a - b)[0];
  }
  const uses = palettes.map(() => 0);
  for (const tile of tiles) if (tile.gbs >= 0 && tile.colors.length <= GB_COLORS) uses[tile.gbs]++;
  // Welche Paletten bekommen in GB Studio falsche Farben? Die, die der Text-/UI-Palette weichen muss,
  // und alle ab Nummer 9 (die landen auf dem Platz einer anderen Palette). Palette 8 selbst rückt nur auf.
  const slots = gbsSlots(palettes);
  // Was wird aus den Farben der ersetzten Palette? GB Studio nimmt je Farbe die ähnlichste der Palette 8.
  // Sind alle fast gleich (z. B. eigene Palette 8 mit denselben Grautönen), sieht man in GB Studio keinen Unterschied.
  let uiMap = [], uiClose = false;
  if (slots.replaced >= 0) {
    const ui = gbUiRaw(), disp = gbUiDisplay();
    uiMap = palettes[slots.replaced].map((u) => {
      const h = gbcHex(u);
      let k = 0, bd = Infinity;
      ui.forEach((c2, i) => { const d = hexDist(h, c2); if (d < bd) { bd = d; k = i; } });
      const to = parseHex('#' + disp[k]);
      const [r1, g1, b1] = unpack(u), [r2, g2, b2] = unpack(to);
      return { from: u, to, same: Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2)) <= 40 };
    });
    uiClose = palettes.length === 8 && uiMap.every((m) => m.same);
  }
  const over = new Set(palettes.map((_, i) => i).filter((i) => (i === slots.replaced && !uiClose) || i >= 8));
  // Kacheln, die GB Studio einer solchen Palette gibt, zeigen genau diese (rot) – nicht die Nachbar-Palette
  for (const tile of tiles) if (over.has(tile.gbs) && tile.colors.length <= GB_COLORS) tile.palette = tile.gbs;
  // Verschiedene Kacheln genau wie GB Studio zählen
  const tileCount = gbsTileCount(tiles, slots, cols, rows, w, h);
  // Rote Kacheln: welche Farben sind zu viel? Behalten wird die Palette (oder die 4 häufigsten Farben der Kachel),
  // die die meisten Pixel abdeckt – alles andere ist „zu viel“ und wird einzeln markiert.
  const extraColors = new Map(), extraPixels = [];
  for (const tile of bad) {
    const count = new Map();
    for (const u of tile.pixels) if (u) count.set(u, (count.get(u) || 0) + 1);
    const covered = (set) => { let n = 0; for (const [u, c] of count) if (set.includes(u)) n += c; return n; };
    let keep = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, GB_COLORS).map(([u]) => u);
    let best = covered(keep);
    for (const p of palettes) { const n = covered(p); if (n > best) { best = n; keep = p; } }
    tile.keep = keep;
    tile.extra = [];
    tile.pixels.forEach((u, k) => {
      if (!u || keep.includes(u)) return;
      const x = tile.tx * GB_TILE + (k % GB_TILE), y = tile.ty * GB_TILE + Math.floor(k / GB_TILE);
      if (x >= w || y >= h) return;
      extraPixels.push(y * w + x);
      extraColors.set(u, (extraColors.get(u) || 0) + 1);
      if (!tile.extra.includes(u)) tile.extra.push(u);
    });
  }
  // Mehr als 7 Paletten: die mit den wenigsten Kacheln gelten als „zu viel“ – die lassen sich am leichtesten einsparen
  // GB Studio hat nur 7 Plätze – Paletten ab Platz 8 bringt es nicht mehr unter (es legt sie auf andere Paletten,
  // die Kacheln bekommen dann falsche Farben, z. B. grau statt blau)
  // Fast gleiche Farben: Zusammenlegen spart oft eine Palette
  const near = [];
  if (palettes.length > GB_MAX_PALETTES) {
    const all = [...new Set(palettes.flat())];
    for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
      const A = unpack(all[a]), B = unpack(all[b]);
      const d = Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]);
      if (d <= 36) near.push([all[a], all[b], d]);
    }
    near.sort((x, y) => x[2] - y[2]);
    // Nur Vorschläge zeigen, die wirklich helfen: jeden Tausch (a → b oder b → a) wie GB Studio durchrechnen
    const verified = [];
    for (const [a, b] of near.slice(0, 12)) {
      if (gbsPaletteCount(tiles, a, b) <= GB_MAX_PALETTES) verified.push([a, b]);
      else if (gbsPaletteCount(tiles, b, a) <= GB_MAX_PALETTES) verified.push([b, a]);
    }
    near.length = 0; near.push(...verified);
  }
  Object.assign(res, { palettes, uses, bad, over, near, uiReplaced: slots.replaced, uiMap, uiClose, uniqueTiles: tileCount.flip, uniqueTilesNoFlip: tileCount.plain, extraPixels, extra: [...extraColors.entries()].sort((a, b) => b[1] - a[1]) });
  res.ok = !bad.length && (palettes.length <= GB_MAX_PALETTES || uiClose) && res.uniqueTiles <= res.tileLimit;
  return res;
}

function scheduleGbCheck() {
  if (!gbView.on) return;
  clearTimeout(gbView.timer);
  gbView.timer = setTimeout(() => { gbView.result = gbAnalyze(); updateGbHud(); requestRender(); }, 120);
}

function setGbView(on) {
  gbView.on = on;
  gbView.result = on ? gbAnalyze() : null;
  updateGbHud();
  requestRender();
}

function updateGbHud() {
  const hud = $('#gb-hud');
  if (!gbView.on || !gbView.result) { hud.hidden = true; $('#gb-legend').hidden = true; return; }
  const r = gbView.result;
  hud.hidden = false;
  renderGbLegend(r);
  hud.classList.toggle('warn', !r.ok);
  const tilesTxt = t('Kacheln {n}/{max}', { n: r.uniqueTiles, max: r.tileLimit });
  if (r.mode === 'classic') {
    $('#gb-hud-text').textContent = 'Game Boy · ' + (r.foreignPixels.length
      ? pl(r.foreign.length, '1 Farbe mit Problem', '{n} Farben mit Problemen')
      : r.mapped.length ? t('passt') : t('nur die 4 Farben')) + ' · ' + tilesTxt;
  } else {
    $('#gb-hud-text').textContent = t('GBC-Paletten {n}/{max}', { n: r.palettes.length, max: GB_MAX_PALETTES })
      + ' · ' + tilesTxt
      + (r.bad.length ? ' · ' + pl(r.bad.length, '1 Kachel mit mehr als 4 Farben', '{n} Kacheln mit mehr als 4 Farben') : '');
  }
}

/** Kleine Paletten-Übersicht unter der Anzeige oben links – Klick auf eine Farbe = Primär, Rechtsklick = Sekundär. */
function renderGbLegend(r) {
  const box = $('#gb-legend');
  const sw = (u) => `<button class="gb-lsw" data-c="${u}" style="background:${cssColor(u)}" title="${toHex(u).toUpperCase()}"></button>`;
  const empty = '<span class="gb-lsw empty"></span>';
  let rows = [];
  if (r.mode === 'classic') {
    const allowed = GB_CLASSIC_COLORS.concat(settings.gbSprite ? [GB_SPRITE_TRANSPARENT] : []);
    rows.push(`<div class="gb-lrow"><span class="gb-ltag ok">✓</span>${allowed.map(sw).join('')}</div>`);
    if (r.foreign.length) rows.push(`<div class="gb-lrow"><span class="gb-ltag warn">!</span>${r.foreign.slice(0, 8).map(([u]) => sw(u)).join('')}${r.foreign.length > 8 ? `<span class="gb-lmore">+${r.foreign.length - 8}</span>` : ''}</div>`);
  } else {
    if (gbView.filter >= r.palettes.length) gbView.filter = -1;
    rows = r.palettes.map((p, i) => `<div class="gb-lrow${r.over.has(i) ? ' gb-over' : ''}${gbView.filter >= 0 && gbView.filter !== i ? ' dim' : ''}" ${r.over.has(i) ? `title="${t('Palette zu viel – {n} Kacheln bekommen in GB Studio andere Farben', { n: r.uses[i] })}"` : ''}><button class="gb-ltag gb-lpick${gbView.filter === i ? ' active' : ''}" data-pal="${i}" title="${t('Klick: nur Palette {n} im Bild zeigen', { n: i + 1 })}" style="background:${r.over.has(i) ? '#ff3250' : GB_HUES[i % GB_HUES.length]}">${i + 1}</button>${p.map(sw).join('')}${empty.repeat(GB_COLORS - p.length)}</div>`);
    if (r.extra.length) rows.push(`<div class="gb-lrow"><span class="gb-ltag warn">!</span>${r.extra.slice(0, 8).map(([u]) => sw(u)).join('')}${r.extra.length > 8 ? `<span class="gb-lmore">+${r.extra.length - 8}</span>` : ''}</div>`);
  }
  if (r.mode !== 'classic') {
    const on = settings.gbLabels !== false;
    rows.push(`<div class="gb-lbtns">${gbView.filter >= 0 ? `<button class="gb-lall">${t('Alle Paletten zeigen')}</button>` : ''}<button class="gb-lall gb-lnums${on ? '' : ' off'}" title="${t('Palettennummern auf den Kacheln ein- oder ausblenden')}">${on ? t('Zahlen aus') : t('Zahlen an')}</button></div>`);
  }
  box.innerHTML = rows.join('');
  box.hidden = !rows.length;
}

function drawGbOverlay(z) {
  const r = gbView.result;
  if (!r) return;
  const s = GB_TILE * z;
  ctx.save();
  ctx.lineWidth = 1;
  const font = Math.max(9, Math.min(14, Math.floor(s * 0.32)));
  ctx.font = `700 ${font}px system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const tileBox = (tile) => {
    const x = view.ox + tile.tx * s, y = view.oy + tile.ty * s;
    return [x, y, Math.min(s, (doc.w - tile.tx * GB_TILE) * z), Math.min(s, (doc.h - tile.ty * GB_TILE) * z)];
  };
  if (r.mode === 'classic') {
    // Kachelraster dezent, Kacheln mit fremden Farben rot umrandet, jeder fremde Pixel rot markiert
    for (const tile of r.tiles) {
      const [x, y, tw, th] = tileBox(tile);
      ctx.strokeStyle = tile.foreign ? '#ff3250' : 'rgba(124, 92, 255, .55)';
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
    }
    ctx.fillStyle = 'rgba(255, 50, 80, .55)';
    ctx.strokeStyle = '#ff3250';
    for (const i of r.foreignPixels) {
      const x = view.ox + (i % doc.w) * z, y = view.oy + Math.floor(i / doc.w) * z;
      ctx.fillRect(x, y, z, z);
      if (z >= 6) ctx.strokeRect(x + 0.5, y + 0.5, z - 1, z - 1);
    }
    ctx.restore();
    return;
  }
  // Nur eine Palette zeigen: genau die Kacheln, denen GB Studio diese Palette gibt – der Rest wird abgedunkelt
  const filter = gbView.filter;
  if (filter >= 0 && filter < r.palettes.length) {
    const col = r.over.has(filter) ? '#ff3250' : GB_HUES[filter % GB_HUES.length];
    ctx.lineWidth = 2;
    for (const tile of r.tiles) {
      const [x, y, tw, th] = tileBox(tile);
      if (tile.gbs !== filter || tile.colors.length > GB_COLORS) { ctx.fillStyle = 'rgba(8, 10, 16, .68)'; ctx.fillRect(x, y, tw, th); continue; }
      ctx.strokeStyle = col; ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2);
      if (s >= 24 && settings.gbLabels !== false) {
        const label = String(filter + 1);
        ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, ctx.measureText(label).width + 6, font + 4);
        ctx.fillStyle = '#fff'; ctx.fillText(label, x + 5, y + 4);
      }
    }
    ctx.restore();
    return;
  }
  for (const tile of r.tiles) {
    const [x, y, tw, th] = tileBox(tile);
    if (tile.colors.length > GB_COLORS) {
      ctx.fillStyle = 'rgba(255, 50, 80, .12)'; ctx.fillRect(x, y, tw, th);
      ctx.strokeStyle = '#ff3250'; ctx.strokeRect(x + 1.5, y + 1.5, tw - 3, th - 3);
      if (s >= 24 && settings.gbLabels !== false) { ctx.fillStyle = '#ff3250'; ctx.fillRect(x + 2, y + 2, font * 1.6, font + 4); ctx.fillStyle = '#fff'; ctx.fillText(tile.colors.length, x + 4, y + 4); }
      continue;
    }
    if (tile.palette < 0) continue;
    const isOver = r.over && r.over.has(tile.palette);
    const col = isOver ? '#ff3250' : GB_HUES[tile.palette % GB_HUES.length];
    if (isOver) {
      ctx.fillStyle = 'rgba(255, 50, 80, .18)'; ctx.fillRect(x, y, tw, th);
      ctx.strokeStyle = col; ctx.strokeRect(x + 1.5, y + 1.5, tw - 3, th - 3);
    } else {
      ctx.strokeStyle = col; ctx.globalAlpha = 0.75;
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      ctx.globalAlpha = 1;
    }
    if (s >= 24 && settings.gbLabels !== false) {
      const label = String(tile.palette + 1) + (tile.multi ? '+' : '');
      ctx.fillStyle = col; ctx.fillRect(x + 2, y + 2, ctx.measureText(label).width + 6, font + 4);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 5, y + 4);
    }
  }
  // überzählige Farben: jeden betroffenen Pixel rot markieren (wie beim klassischen Game Boy)
  if (r.extraPixels && r.extraPixels.length) {
    ctx.fillStyle = 'rgba(255, 50, 80, .6)';
    ctx.strokeStyle = '#ff3250';
    for (const i of r.extraPixels) {
      const px = view.ox + (i % doc.w) * z, py = view.oy + Math.floor(i / doc.w) * z;
      ctx.fillRect(px, py, z, z);
      if (z >= 6) ctx.strokeRect(px + 0.5, py + 0.5, z - 1, z - 1);
    }
  }
  ctx.restore();
}

async function gbPaletteDialog() {
  commitFloat();
  const mode = gbMode();
  const r = gbAnalyze();
  if (gbView.on) { gbView.result = r; updateGbHud(); requestRender(); }
  const swatch = (u) => `<span class="gb-sw" style="background:${cssColor(u)}" title="${toHex(u).toUpperCase()}"></span>`;
  const tilesOk = r.uniqueTiles <= r.tileLimit;
  const empty = !r.tiles.some((tile) => tile.colors.length);
  const toggle = `<div class="gb-mode" role="group">
      <button type="button" class="gb-mode-btn ${mode === 'color' ? 'active' : ''}" data-mode="color">Game Boy Color</button>
      <button type="button" class="gb-mode-btn ${mode === 'classic' ? 'active' : ''}" data-mode="classic">Game Boy (klassisch)</button>
    </div>`;
  // Kachel mit Wert, Balken und Hinweis
  const stat = (label, value, max, ok, note = '') => `<div class="gbx-stat ${ok ? 'ok' : 'warn'}">
      <div class="gbx-stat-label">${label}</div>
      <div class="gbx-stat-value">${value}${max != null ? `<span> / ${max}</span>` : ''}</div>
      ${max != null ? `<div class="gbx-bar"><i style="width:${Math.min(100, Math.round((parseFloat(value) / max) * 100))}%"></i></div>` : ''}
      ${note ? `<div class="gbx-stat-note">${note}</div>` : ''}</div>`;
  const issues = [], tips = [];
  let title, head, sub, stats, main = '', extraBlock = '';

  if (mode === 'classic') {
    title = 'Game Boy (klassisch) – Farben prüfen';
    const colorsOk = !r.foreignPixels.length;
    const allowed = GB_CLASSIC_COLORS.concat(settings.gbSprite ? [GB_SPRITE_TRANSPARENT] : []);
    head = r.ok ? t('Passt für den Game Boy') : t('Passt noch nicht für den Game Boy');
    sub = !colorsOk ? pl(r.foreign.length, '1 Farbe macht Probleme', '{n} Farben machen Probleme')
      : r.mapped.length ? pl(r.mapped.length, '1 Farbe weicht leicht ab – GB Studio macht daraus die richtige', '{n} Farben weichen leicht ab – GB Studio macht daraus die richtigen')
      : t('Nur die erlaubten Farben');
    stats = stat(t('Problemfarben'), String(r.foreign.length), null, colorsOk, colorsOk ? (r.mapped.length ? pl(r.mapped.length, '1 leicht abweichend – passt', '{n} leicht abweichend – passt') : t('alles erlaubt')) : t('mit Problemen'))
      + stat(t('Kacheln'), String(r.uniqueTiles), r.tileLimit, tilesOk);
    const chip = (u, label) => `<span class="gbx-chip">${swatch(u)}<span>${label}</span></span>`;
    const mapChip = (e, extra = '') => `<span class="gbx-chip">${swatch(e.u)}<b class="gbx-arrow">→</b>${swatch(e.target)}<span>${pl(e.n, '1 Pixel', '{n} Pixel')}${extra}</span></span>`;
    main = `<div class="gbx-section"><div class="gbx-title">${t('Erlaubt')}</div>
        <div class="gbx-chips">${allowed.map((u) => chip(u, toHex(u).toUpperCase())).join('')}</div></div>
      ${r.foreignInfo.length ? `<div class="gbx-section"><div class="gbx-title warn">${t('Problem – wird in GB Studio zu')}</div>
        <div class="gbx-chips">${r.foreignInfo.slice(0, 12).map((e) => mapChip(e, ' · ' + (e.merge ? t('wird gleich wie {c}', { c: toHex(e.merge).toUpperCase() }) : t('Grenzfall')))).join('')}${r.foreignInfo.length > 12 ? `<span class="hint">+${r.foreignInfo.length - 12}</span>` : ''}</div></div>` : ''}
      ${r.mapped.length ? `<div class="gbx-section"><div class="gbx-title">${t('Leicht abweichend – wird in GB Studio zu')}</div>
        <div class="gbx-chips">${r.mapped.slice(0, 12).map((e) => mapChip(e)).join('')}${r.mapped.length > 12 ? `<span class="hint">+${r.mapped.length - 12}</span>` : ''}</div></div>` : ''}
      <label class="toggle gb-sprite"><input type="checkbox" id="gb-sprite" ${settings.gbSprite ? 'checked' : ''}><span>${t('Sprite – #65FF00 als Transparenz erlauben')}</span></label>`;
    if (!colorsOk) issues.push({ text: t('Rot markierte Farben liegen an einer Helligkeitsgrenze oder werden im Spiel gleich wie eine andere Farbe. Prüfe, ob das so gewollt ist.'), apply: 'classic-foreign', label: t('Wie GB Studio übernehmen') });
    if (colorsOk && r.mapped.length) tips.push({ text: t('Leicht abweichende Farben sind kein Problem – GB Studio ordnet sie nach Helligkeit der richtigen der 4 Farben zu. Mit „Angleichen“ setzt Pixel Bro sie auf die genauen Werte.'), apply: 'classic-mapped', label: t('Angleichen') });
    if (!tilesOk) issues.push(pl(r.uniqueTiles - r.tileLimit, '1 Kachel zu viel – gleiche Bereiche wiederverwenden.', '{n} Kacheln zu viel – gleiche Bereiche wiederverwenden.'));
    extraBlock = t('Game Boy (klassisch): GB Studio kennt nur 4 Helligkeitsstufen und ordnet jede Farbe nach ihrem Grünanteil zu (ab 205 hellste, ab 130 hell, ab 65 dunkel, darunter dunkelste). Genaue HEX-Codes sind daher egal. Höchstens 192 verschiedene 8×8-Kacheln. Geprüft wird der aktuelle Frame.');
  } else {
    title = 'Game Boy Color – Paletten prüfen';
    const over = r.palettes.length > GB_MAX_PALETTES && !r.uiClose;
    const palOk = r.palettes.length <= GB_MAX_PALETTES || r.uiClose;
    head = r.ok ? t('Passt in GB Studio') : t('Passt noch nicht in GB Studio');
    sub = t('{n} von {max} Paletten', { n: r.palettes.length, max: GB_MAX_PALETTES }) + ' · ' + t('{n} von {max} Kacheln', { n: r.uniqueTiles, max: r.tileLimit });
    stats = stat(t('Paletten'), String(r.palettes.length), GB_MAX_PALETTES, palOk, r.uiClose ? t('8. passt zu deiner Palette 8') : over ? t('GB Studio ersetzt eine still') : t('frei für Hintergründe'))
      + stat(t('Kacheln'), String(r.uniqueTiles), r.tileLimit, tilesOk, r.uniqueTilesNoFlip !== r.uniqueTiles ? t('ohne Spiegeln: {n}', { n: r.uniqueTilesNoFlip }) : '');
    const maxUse = Math.max(1, ...r.uses);
    const rows = r.palettes.map((p, i) => {
      const bad = r.over.has(i);
      const mapRow = i === r.uiReplaced ? `<div class="gbx-map ${r.uiClose ? 'ok' : ''}"><span>${t('In GB Studio:')}</span>${r.uiMap.map((m) => `<span class="gb-map${m.same ? '' : ' diff'}">${swatch(m.from)}<b>→</b>${swatch(m.to)}</span>`).join('')}</div>` : '';
      return `<div class="gbx-pal${bad ? ' bad' : ''}${i === r.uiReplaced && r.uiClose ? ' close' : ''}">
          <span class="gb-num" style="background:${bad ? '#ff3250' : GB_HUES[i % GB_HUES.length]}">${i + 1}</span>
          <span class="gb-sws">${p.map(swatch).join('')}${'<span class="gb-sw empty"></span>'.repeat(GB_COLORS - p.length)}</span>
          <span class="gbx-use"><span class="gbx-bar"><i style="width:${Math.max(3, Math.round((r.uses[i] / maxUse) * 100))}%"></i></span><span class="gbx-n">${pl(r.uses[i], '1 Kachel', '{n} Kacheln')}</span></span>
          ${mapRow}</div>`;
    }).join('');
    main = `<div class="gbx-section"><div class="gbx-title">${t('Paletten')}</div><div class="gbx-pals">${rows}</div></div>
      ${r.extra.length ? `<div class="gbx-section"><div class="gbx-title warn">${t('Zu viel')}</div><div class="gbx-chips">${r.extra.slice(0, 12).map(([u, n]) => `<span class="gbx-chip">${swatch(u)}<span>${pl(n, '1 Pixel', '{n} Pixel')}</span></span>`).join('')}</div></div>` : ''}`;
    if (r.uiClose) tips.push(t('Palette {p} nutzt in GB Studio deine Palette 8 (Text/UI) – die Farben sind fast gleich, das passt.', { p: r.uiReplaced + 1 }));
    if (r.bad.length) issues.push({ apply: 'extra', label: t('Wie GB Studio übernehmen'), text: pl(r.bad.length, '1 Kachel hat mehr als 4 Farben – die überzähligen Pixel sind im Bild rot markiert. Färbe sie in eine der anderen Farben der Kachel um.', '{n} Kacheln haben mehr als 4 Farben – die überzähligen Pixel sind im Bild rot markiert. Färbe sie in eine der anderen Farben der Kachel um.') });
    if (over) issues.push(pl(r.palettes.length - GB_MAX_PALETTES, '1 Palette zu viel – GB Studio braucht Platz 8 für Text und gibt dafür still Palette {p} die Farben deiner Palette 8 (siehe unten). Farben angleichen oder ähnliche Kacheln zusammenfassen.', '{n} Paletten zu viel – Kacheln mit Palette {p} bekommen in GB Studio falsche Farben. Farben angleichen oder ähnliche Kacheln zusammenfassen.', { p: [...r.over].map((i) => i + 1).join(', ') }));
    if (over) r.near.slice(0, 3).forEach(([a, b], k) => tips.push({ text: t('Geprüfter Tipp – damit reichen 7 Paletten:') + ` <span class="gb-pair">${swatch(a)}${toHex(a).toUpperCase()} → ${swatch(b)}${toHex(b).toUpperCase()}</span>`, apply: 'tip:' + k, label: t('Übernehmen') }));
    if (!tilesOk) issues.push(pl(r.uniqueTiles - r.tileLimit, '1 Kachel zu viel – gleiche Bereiche wiederverwenden.', '{n} Kacheln zu viel – gleiche Bereiche wiederverwenden.'));
    main += `<div class="gbx-section gbx-ui"><div class="gbx-title">${t('Palette 8 · Text/UI deiner Szene')}<span class="hint">${t('HEX wie in GB Studio')}</span></div>
      <div class="gbx-uifields">${gbUiDisplay().map((h, k) => `<label class="gb-uihex">${swatch(parseHex('#' + h))}<input type="text" maxlength="7" spellcheck="false" value="#${h.toUpperCase()}" data-k="${k}" data-nofocus></label>`).join('')}
        <button type="button" class="btn gb-uireset" title="${t('GB-Studio-Vorgabe')}" ${settings.gbUi ? '' : 'hidden'}>↺</button></div></div>`;
    extraBlock = t('GB Studio (Farbmodus): Jede 8×8-Kachel nutzt eine Palette mit 4 Farben. 7 Paletten sind für Hintergründe frei, die 8. ist für Text und UI reserviert. Höchstens 384 verschiedene Kacheln. Geprüft wird der aktuelle Frame.') + ' ' + t('Die Paletten werden genau so aufgeteilt wie in GB Studio („Automatisch“).') + ' ' + t('Kacheln werden wie in GB Studio gezählt: gleiches Muster mit anderer Palette und gespiegelte Kacheln zählen nur einmal.') + ' ' + t('„6+“ im Bild: Die Kachel passt auch in andere Paletten und bekommt die Palette ihrer Nachbarn.');
  }
  if (r.partial) issues.push(t('Breite und Höhe sind kein Vielfaches von 8 – GB Studio erwartet ganze 8×8-Kacheln.'));
  if (empty) { head = t('Das Bild enthält noch keine Farben'); sub = ''; }
  const note = (cls, icon, x) => { const o = typeof x === 'string' ? { text: x } : x; return `<div class="gbx-note ${cls}"><span>${icon}</span><p>${o.text}</p>${o.apply ? `<button type="button" class="btn gbx-apply" data-apply="${o.apply}">${o.label}</button>` : ''}</div>`; };
  const ok = r.ok && !empty;
  const body = el(`<div class="gbx">${toggle}
    <div class="gbx-status ${empty ? '' : ok ? 'ok' : 'warn'}">
      <div class="gbx-icon">${empty ? '·' : ok ? '✓' : '!'}</div>
      <div><div class="gbx-head">${head}</div>${sub ? `<div class="gbx-sub">${sub}</div>` : ''}</div>
    </div>
    ${empty ? '' : `<div class="gbx-stats">${stats}</div>`}
    ${issues.map((x) => note('issue', '!', x)).join('')}
    ${tips.map((x) => note('tip', '✓', x)).join('')}
    ${main}
    <details class="gbx-info"><summary>${t('So prüft Pixel Bro')}</summary><p>${extraBlock}</p></details>
  </div>`);

  // Umschalter und Sprite-Option: Auswahl speichern und Dialog mit dem neuen Modus neu aufbauen
  const reopen = () => $('#gb-reopen').click();
  body.querySelectorAll('.gb-mode-btn').forEach((b) => b.onclick = () => {
    if (settings.gbMode === b.dataset.mode) return;
    settings.gbMode = b.dataset.mode; saveSettings(); reopen();
  });
  body.querySelectorAll('.gb-uihex input').forEach((inp) => inp.onchange = () => {
    const u = parseHex(inp.value);
    if (!u) { inp.value = '#' + gbUiDisplay()[+inp.dataset.k].toUpperCase(); return; }
    const cur2 = gbUiDisplay().slice();
    cur2[+inp.dataset.k] = toHex(u).slice(1);
    settings.gbUi = cur2.join() === GB_UI_DEFAULT.join() ? null : cur2;
    saveSettings(); reopen();
  });
  body.querySelectorAll('[data-apply]').forEach((btn) => btn.onclick = () => {
    const what = btn.dataset.apply;
    let n = 0;
    if (what === 'classic-mapped' || what === 'classic-foreign') {
      n = gbRecolor(new Map((what === 'classic-mapped' ? r.mapped : r.foreignInfo).map((e) => [e.u, e.target])));
    } else if (what.startsWith('tip:')) {
      const [a, b] = r.near[+what.slice(4)];
      const map = new Map();
      for (const L of doc.layers) for (const f of L.frames) for (const u of f) {
        if (!(u >>> 24)) continue;
        const s2 = (u | 0xff000000) >>> 0;
        if (!map.has(s2) && r.solid(s2) === a) map.set(s2, b);
      }
      n = gbRecolor(map);
    } else if (what === 'extra') n = gbFixExtraPixels(r);
    toast(t('{n} Pixel umgefärbt', { n }) + ' · ' + t('Strg+Z macht es rückgängig'));
    reopen();
  });
  const uiReset = body.querySelector('.gb-uireset');
  if (uiReset) uiReset.onclick = () => { settings.gbUi = null; saveSettings(); reopen(); };
  const sp = body.querySelector('#gb-sprite');
  if (sp) sp.onchange = () => { settings.gbSprite = sp.checked; saveSettings(); reopen(); };

  const actions = [{ label: 'Schließen', value: false }, { label: '', value: 'reopen', id: 'gb-reopen', hidden: true }];
  if (mode === 'color' && r.palettes.length) actions.push({ label: 'Paletten speichern', value: 'save' });
  actions.push({ label: gbView.on ? 'Im Bild ausblenden' : 'Im Bild zeigen', value: 'toggle', primary: true });
  const res = await modal({ title, body, actions, wide: true });
  if (res === 'reopen') {
    if (gbView.on) { gbView.result = gbAnalyze(); updateGbHud(); requestRender(); }
    return gbPaletteDialog();
  }
  if (res === 'toggle') setGbView(!gbView.on);
  if (res === 'save') {
    const free = MAX_CUSTOM_PALETTES - customPalettes.length;
    if (free <= 0) return toast(t('Maximal {max} eigene Paletten – lösch eine, um Platz zu machen', { max: MAX_CUSTOM_PALETTES }));
    const base = fileInfo.name && fileInfo.name !== 'unbenannt' ? baseName() : 'GB';
    const list = r.palettes.slice(0, free);
    let last = null;
    list.forEach((p, i) => {
      const pal = { id: newPaletteId(), name: `${base} – GB ${i + 1}`, colors: p.slice() };
      customPalettes.push(pal); last = pal;
    });
    saveCustomPalettes();
    if (last) selectPalette(CUSTOM_PREFIX + last.id);
    toast(t('{n} Paletten gespeichert', { n: list.length }) + (list.length < r.palettes.length ? ' · ' + t('Limit von {max} eigenen Paletten erreicht', { max: MAX_CUSTOM_PALETTES }) : ''));
  }
}

/* ---------- Werkzeugauswahl ---------- */
const TOOL_OPTIONS = {
  pen: ['size', 'pp'], eraser: ['size'], bucket: ['contig'], picker: [],
  line: ['size'], rect: ['size', 'fill'], ellipse: ['size', 'fill'],
  select: [], wand: ['contig'], move: [], dither: ['size'], shade: ['size', 'shade'], hand: [],
  gradient: ['grad', 'contig'], spray: ['size', 'spray'], text: [],
};
const TOOL_NAMES = {
  pen: 'Stift', eraser: 'Radierer', bucket: 'Füllen', picker: 'Pipette', line: 'Linie', rect: 'Rechteck',
  ellipse: 'Ellipse', select: 'Auswahl', wand: 'Zauberstab', move: 'Verschieben', dither: 'Dithering', shade: 'Aufhellen/Abdunkeln', hand: 'Hand',
  gradient: 'Verlauf', spray: 'Sprühdose', text: 'Text',
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
  $('#opt-grad').hidden = !opts.includes('grad');
  $('#opt-spray').hidden = !opts.includes('spray');
  updateCursor();
  status(TOOL_NAMES[t]);
  requestRender();
}
/* Mauszeiger auf der Zeichenfläche: lila mit weißem und dunklem Rand – auf hellen und dunklen Bildern gut sichtbar */
function svgCursor(body, x, y, fallback) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, ${fallback}`;
}
const outlined = (d, w = 2) => `<path d="${d}" stroke="#14101f" stroke-width="${w + 4}"/><path d="${d}" stroke="#fff" stroke-width="${w + 2}"/><path d="${d}" stroke="#7c5cff" stroke-width="${w}"/>`;
const HAND_PATH = 'M22 15V10a2 2 0 0 0-4 0v4M18 13V8a2 2 0 0 0-4 0v5M14 13.5V9a2 2 0 0 0-4 0v8M22 12a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L11 18';
const CURSORS = {
  crosshair: svgCursor(outlined('M16 4v8M16 20v8M4 16h8M20 16h8') + '<circle cx="16" cy="16" r="1.6" fill="#7c5cff" stroke="#fff" stroke-width="1"/>', 16, 16, 'crosshair'),
  text: svgCursor(outlined('M12 5h8M16 5v22M12 27h8'), 16, 16, 'text'),
  grab: svgCursor(outlined(HAND_PATH), 16, 16, 'grab'),
  // Pipette: Spitze unten links ist der Klickpunkt
  picker: svgCursor(`<g transform="translate(3 3)">${outlined('m2 22 1-1h3l9-9M3 21v-3l9-9m6-3 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z')}</g>`, 5, 27, 'copy'),
  move: svgCursor(`<g transform="translate(4 4)">${outlined('M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20')}</g>`, 16, 16, 'move'),
  grabbing: svgCursor(outlined('M22 15v-3a2 2 0 0 0-4 0v2M18 14v-3a2 2 0 0 0-4 0v3M14 14v-2a2 2 0 0 0-4 0v5M22 13a2 2 0 1 1 4 0v4a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L11 18'), 16, 16, 'grabbing'),
};
// Eigene lila Hand auch in der Vorschau (die Windows-Hand ist auf hellen Bildern kaum zu sehen)
document.documentElement.style.setProperty('--cur-grab', CURSORS.grab);
document.documentElement.style.setProperty('--cur-grabbing', CURSORS.grabbing);
function updateCursor() {
  const t = activeTool();
  canvas.style.cursor = t === 'hand' ? CURSORS.grab : t === 'move' ? CURSORS.move : t === 'picker' ? CURSORS.picker : t === 'text' ? CURSORS.text : CURSORS.crosshair;
}
function setBrushSize(s) {
  settings.size = clamp(s, 1, 16);
  $('#brush-size').value = settings.size;
  $('#brush-size-val').textContent = settings.size + ' px';
  requestRender();
}

/* ---------- Dialoge ---------- */
function modal({ title, body, actions, wide = false }) {
  return new Promise((resolve) => {
    $('#modal').classList.toggle('wide', !!wide);
    $('#modal').classList.toggle('xl', wide === 'xl');
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
      if (act.id) btn.id = act.id;
      if (act.hidden) btn.style.display = 'none';
      btn.onclick = () => close(act.value);
      a.appendChild(btn);
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
      if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA' && !e.ctrlKey) { e.stopPropagation(); return; }
      if (e.key === 'Enter' && e.target.dataset && 'nofocus' in e.target.dataset) { e.stopPropagation(); e.preventDefault(); e.target.blur(); return; }
      if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); const p = (actions || []).find((x) => x.primary); close(p ? p.value : true); }
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    $('#modal-backdrop').hidden = false;
    const first = b.querySelector('input:not([data-nofocus]), textarea');
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
  prepareNewTab();
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

/* ---------- Exportieren: ein Fenster mit Umschalter PNG · Spritesheet · GIF ----------
   Der Knopf „Exportieren“ öffnet das zuletzt benutzte Format (settings.exportFormat).
   Ein Klick auf den Umschalter merkt sich das Format und baut das Fenster neu auf. */
const EXPORT_FORMATS = [['png', 'PNG'], ['sheet', 'Spritesheet'], ['gif', 'GIF']];
function exportToggle(active) {
  return `<div class="gb-mode exp-mode" role="group">${EXPORT_FORMATS.map(([k, label]) =>
    `<button type="button" class="gb-mode-btn ${k === active ? 'active' : ''}" data-format="${k}">${label}</button>`).join('')}</div>`;
}
/** Zeigt ein Export-Fenster mit Umschalter. Gibt true (exportieren), false (abbrechen) oder ein anderes Format zurück. */
async function exportModal(format, title, body) {
  settings.exportFormat = format; saveSettings();
  let switchTo = null;
  body.querySelectorAll('.exp-mode .gb-mode-btn').forEach((b) => b.onclick = () => {
    if (b.dataset.format === format) return;
    switchTo = b.dataset.format;
    $('#exp-switch').click();
  });
  const res = await modal({ title, body, actions: [{ label: 'Abbrechen', value: false }, { label: '', value: 'switch', id: 'exp-switch', hidden: true }, { label: 'Exportieren', value: true, primary: true }] });
  return res === 'switch' ? switchTo : res;
}
const EXPORT_DIALOGS = { png: () => dialogExportPNG(), sheet: () => dialogExportSheet(), gif: () => dialogExportGIF() };
function dialogExport() {
  const f = EXPORT_DIALOGS[settings.exportFormat] ? settings.exportFormat : 'png';
  return EXPORT_DIALOGS[f]();
}

async function dialogExportPNG() {
  commitFloat();
  const body = el(`${exportToggle('png')}<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(1)}</select></div>
    <div class="field"><label>Inhalt</label><select id="what"><option value="frame">${t('Aktueller Frame ({n})', { n: cur.frame + 1 })}</option><option value="layer">Nur aktuelle Ebene</option></select></div>`);
  const ok = await exportModal('png', 'Als PNG exportieren', body);
  if (typeof ok === 'string') return EXPORT_DIALOGS[ok]();
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
  const body = el(`${exportToggle('sheet')}<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(1)}</select></div>
    <div class="field"><label>Anordnung</label><select id="lay"><option value="h">Horizontal (1 Zeile)</option><option value="v">Vertikal (1 Spalte)</option><option value="g">Raster</option></select></div>
    <div class="field" id="cols-field" hidden><label>Spalten (bei Raster)</label><input type="number" id="cols" min="1" max="${n}" value="${n}"></div>
    <p class="hint">${t('{n} Frame(s) · {w} × {h} px pro Frame', { n, w: doc.w, h: doc.h })}</p>`);
  // Spalten nur bei „Raster“ zeigen, vorbelegt mit der Anzahl der Frames
  const laySel = body.querySelector('#lay');
  laySel.onchange = () => { body.querySelector('#cols-field').hidden = laySel.value !== 'g'; };
  const ok = await exportModal('sheet', 'Spritesheet exportieren', body);
  if (typeof ok === 'string') return EXPORT_DIALOGS[ok]();
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
  const body = el(`${exportToggle('gif')}<div class="field"><label>Skalierung</label><select id="sc">${scaleOptions(4)}</select></div>
    <div class="field-row">
      <div class="field"><label>FPS</label><input type="number" id="gfps" min="1" max="50" value="${doc.fps}"></div>
      <div class="field"><label>Wiederholen</label><select id="loop"><option value="1">Endlos</option><option value="0">Einmal</option></select></div>
    </div>
    <p class="hint">Halbtransparente Pixel werden voll deckend gespeichert, vollständig transparente bleiben transparent.</p>`);
  const ok = await exportModal('gif', 'Animiertes GIF exportieren', body);
  if (typeof ok === 'string') return EXPORT_DIALOGS[ok]();
  if (!ok) return;
  const s = parseInt(body.querySelector('#sc').value);
  const fps = clamp(parseInt(body.querySelector('#gfps').value) || doc.fps, 1, 50);
  const loop = body.querySelector('#loop').value === '1';
  const bytes = buildGIF(s, fps, loop);
  await saveBytes(bytes, baseName() + '.gif', [{ name: t('GIF-Animation'), extensions: ['gif'] }], 'image/gif');
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
  await saveBytes(bytes, name, [{ name: t('PNG-Bild'), extensions: ['png'] }], 'image/png');
}
async function saveBytes(bytes, name, filters, mime, path = null) {
  if (nativeApi) {
    const p = await nativeApi.saveFile({ defaultPath: path || name, filters, data: bytes, path });
    if (p) toast(t('Gespeichert: {name}', { name: p.split(/[\\/]/).pop() }));
    return p;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(t('Download gestartet: {name}', { name }));
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
function serialize(d = doc) {
  return JSON.stringify({
    app: 'PixelBro', version: 1, w: d.w, h: d.h, fps: d.fps,
    palette: settings.palette.map((c) => toHex(c, true)),
    layers: d.layers.map((l) => ({ name: l.name, visible: l.visible, opacity: l.opacity, frames: l.frames.map((f) => b64(new Uint8Array(f.buffer))) })),
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
    // Schon offen? Dann zu diesem Tab wechseln statt doppelt öffnen
    const open = path ? tabs.findIndex((tb, i) => (i === activeTab ? fileInfo.path : tb && tb.fileInfo.path) === path) : -1;
    if (open >= 0) { switchTab(open); return toast(t('Schon geöffnet: {name}', { name: name || path })); }
    prepareNewTab();
    history.undo = []; history.redo = [];
    float = null; sel = null;
    doc = r.doc;
    cur = { layer: doc.layers.length - 1, frame: 0 };
    if (r.palette && r.palette.length) adoptProjectPalette(r.palette.map(parseHex).filter((x) => x !== null), name || 'Projekt');
    fileInfo = { path: path || null, name: name || 'unbenannt.pixelbro' };
    dirty = false;
    updateTitle();
    syncDocUI();
    zoomFit();
    afterStructureChange();
    toast(t('Geöffnet: {name}', { name: fileInfo.name }));
  } catch (err) {
    modal({ title: 'Datei konnte nicht geöffnet werden', body: `<p>${err.message}</p>` });
  }
}
async function saveProject(saveAs = false) {
  commitFloat();
  const name = baseName() + '.pixelbro';
  const bytes = new TextEncoder().encode(serialize());
  const p = await saveBytes(bytes, name, [{ name: t('Pixel-Bro-Projekt'), extensions: ['pixelbro'] }], 'application/json', saveAs ? null : fileInfo.path);
  if (p) {
    fileInfo = { path: nativeApi ? p : null, name: p.split(/[\\/]/).pop() };
    dirty = false;
    updateTitle();
  }
  return p;
}
async function openProject() {
  if (nativeApi) {
    const r = await nativeApi.openFile({ filters: [{ name: t('Pixel-Bro-Projekt'), extensions: ['pixelbro', 'json'] }] });
    if (r) loadProject(new TextDecoder().decode(r.data), r.name, r.path);
  } else $('#file-open').click();
}
async function importImage() {
  if (nativeApi) {
    const r = await nativeApi.openFile({ filters: [{ name: t('Bilder'), extensions: ['png', 'gif', 'jpg', 'jpeg', 'bmp', 'webp'] }] });
    if (r) handleImageBlob(new Blob([r.data]), r.name);
  } else $('#file-import').click();
}
async function handleImageBlob(blob, name) {
  const img = await createImageBitmap(blob).catch(() => null);
  if (!img) return toast('Bild konnte nicht gelesen werden');
  // Neue Sprites dürfen höchstens 1024 × 1024 px groß sein – größere Bilder gleich im Fenster melden und Verkleinern anbieten
  const MAXD = 1024;
  const big = img.width > MAXD || img.height > MAXD;
  const f = Math.min(MAXD / img.width, MAXD / img.height);
  const sw = Math.max(1, Math.round(img.width * f)), sh = Math.max(1, Math.round(img.height * f));
  const body = el(`<p>${name} · ${img.width} × ${img.height} px</p>
    ${big ? `<p class="gb-warn imp-big">${t('Zu groß für ein neues Sprite – höchstens {m} × {m} px.', { m: MAXD })}</p>` : ''}
    <div class="field"><label>Importieren als</label><select id="im">
      ${big ? `<option value="shrink" selected>${t('Verkleinert als neues Sprite ({w} × {h} px)', { w: sw, h: sh })}</option>` : `<option value="new">Neues Sprite</option>`}
      <option value="layer">Neue Ebene im aktuellen Frame</option>
      <option value="sheet">Spritesheet → Frames aufteilen</option>
    </select></div>
    <div class="field-row"><div class="field"><label>Frame-Breite</label><input type="number" id="fw" value="${Math.min(img.width, img.height)}"></div>
    <div class="field"><label>Frame-Höhe</label><input type="number" id="fh" value="${Math.min(img.width, img.height)}"></div></div>
    <p class="hint">Frame-Größe gilt nur für „Spritesheet“.</p>`);
  const ok = await modal({ title: 'Bild importieren', body, actions: [{ label: 'Abbrechen', value: false }, { label: 'Importieren', value: true, primary: true }] });
  if (!ok) return;
  let mode = body.querySelector('#im').value;
  const c = document.createElement('canvas');
  const shrink = mode === 'shrink';
  c.width = shrink ? sw : img.width; c.height = shrink ? sh : img.height;
  const cc = c.getContext('2d', { willReadFrequently: true });
  cc.imageSmoothingEnabled = false; // Pixel bleiben scharf
  cc.drawImage(img, 0, 0, c.width, c.height);
  if (shrink) mode = 'new';
  commitFloat(false);
  if (mode === 'new') {
    if (c.width > MAXD || c.height > MAXD) return toast('Maximal 1024 × 1024 px');
    prepareNewTab();
    newDocument(c.width, c.height);
    doc.layers[0].frames[0] = new Uint32Array(cc.getImageData(0, 0, c.width, c.height).data.buffer);
    fileInfo.name = name.replace(/\.[^.]+$/, '');
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
    prepareNewTab();
    newDocument(fw, fh);
    const frames = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      frames.push(new Uint32Array(cc.getImageData(q * fw, r * fh, fw, fh).data.buffer));
    }
    doc.layers[0].frames = frames;
    fileInfo.name = name;
    toast(t('{n} Frames importiert', { n: frames.length }));
  }
  markDirty();
  updateTitle();
  zoomFit();
  afterStructureChange();
}

/* ---------- Autosave & Einstellungen ---------- */
let autosaveTimer = null;
// Sichert alle offenen Tabs (Name, Pfad, Pixel, ungespeichert ja/nein) – beim nächsten Start sind alle wieder da
function writeAutosave() {
  if (!tabs.length) return;
  tabs[activeTab] = captureTab();
  const list = tabs.map((tb) => ({ name: tb.fileInfo.name, path: tb.fileInfo.path, dirty: tb.dirty, data: serialize(tb.doc) }));
  try { localStorage.setItem('pixelbro.autosave', JSON.stringify({ tabs: list, active: activeTab })); }
  catch (e) {
    // Speicher voll (sehr viele/große Tabs): wenigstens den aktiven Tab sichern
    try { localStorage.setItem('pixelbro.autosave', JSON.stringify({ tabs: [list[activeTab]], active: 0 })); } catch (e2) { /* nichts zu machen */ }
  }
}
function autosaveNow() {
  clearTimeout(autosaveTimer);
  writeAutosave();
}
function scheduleAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(writeAutosave, 1200);
}
function saveSettings() {
  try {
    const { tool, size, filled, pixelPerfect, contiguous, shade, mirrorX, mirrorY, grid, onion, tileGrid, primary, secondary, recent, paletteName, theme, autoUpdate, center, gradSteps, gradDither, sprayDensity, lang, gbMode, gbSprite, gbUi, gbLabels, exportFormat } = settings;
    localStorage.setItem('pixelbro.settings', JSON.stringify({ tool, size, filled, pixelPerfect, contiguous, shade, mirrorX, mirrorY, grid, onion, tileGrid, primary, secondary, recent, paletteName, theme, autoUpdate, center, gradSteps, gradDither, sprayDensity, lang, gbMode, gbSprite, gbUi, gbLabels, exportFormat }));
  } catch (e) { /* ignorieren */ }
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('pixelbro.settings') || 'null');
    if (s) Object.assign(settings, s);
    loadCustomPalettes();
    if (settings.paletteName === 'Eigene Palette' && customPalettes.length) settings.paletteName = CUSTOM_PREFIX + customPalettes[0].id; // alte Einstellung
    if (settings.paletteName === 'GB Studio') settings.paletteName = 'GB Studio – Sprites'; // bis 1.2.1 hieß sie nur „GB Studio“
    const custom = currentCustom();
    if (custom) settings.palette = custom.colors.slice();
    else if (PALETTES[settings.paletteName]) settings.palette = PALETTES[settings.paletteName].map(parseHex);
    else if (settings.paletteName === USED) settings.palette = [];
    else { settings.paletteName = 'Bro 32'; settings.palette = PALETTES['Bro 32'].map(parseHex); }
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
  const map = { 'toggle-grid': 'grid', 'toggle-center': 'center', 'toggle-tile': 'tile', 'toggle-onion': 'onion' };
  for (const [cmd, key] of Object.entries(map)) $$(`[data-cmd="${cmd}"]`).forEach((b) => b.classList.toggle('checked', !!settings[key]));
  $$('[data-cmd="toggle-tilegrid"]').forEach((b) => b.classList.toggle('checked', settings.tileGrid > 1));
  $$('[data-cmd="toggle-autoupdate"]').forEach((b) => b.classList.toggle('checked', !!settings.autoUpdate));
  $$('[data-cmd="lang-de"]').forEach((b) => b.classList.toggle('checked', settings.lang !== 'en'));
  $$('[data-cmd="lang-en"]').forEach((b) => b.classList.toggle('checked', settings.lang === 'en'));
}

/** Sprache umschalten – alles wird sofort übersetzt, Projekt und Einstellungen bleiben. */
function setLanguage(lang) {
  settings.lang = lang === 'en' ? 'en' : 'de';
  I18N.set(settings.lang);
  if (nativeApi && nativeApi.setLanguage) nativeApi.setLanguage(settings.lang);
  saveSettings();
  syncMenuChecks();
  renderPalette();
  afterStructureChange();
  status(TOOL_NAMES[settings.tool] || '');
  updateTitle();
}

const commands = {
  new: dialogNew,
  'tab-new': () => newTab(),
  'tab-close': () => closeTab(activeTab),
  'tab-next': () => tabs.length > 1 && switchTab((activeTab + 1) % tabs.length),
  'tab-prev': () => tabs.length > 1 && switchTab((activeTab - 1 + tabs.length) % tabs.length),
  open: openProject,
  save: () => saveProject(false),
  'save-as': () => saveProject(true),
  import: importImage,
  'export-png': dialogExportPNG,
  'export-sheet': dialogExportSheet,
  'export-gif': dialogExportGIF,
  export: dialogExport,
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
  'gb-palettes': gbPaletteDialog,
  'clear-layer': () => { commitFloat(false); pushUndo(); curBuf().fill(0); afterPaint(); },
  'toggle-grid': () => toggleSetting('grid', '#opt-grid'),
  'toggle-center': () => toggleSetting('center', '#opt-center'),
  'lang-de': () => setLanguage('de'),
  'lang-en': () => setLanguage('en'),
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
  guide: () => showGuide(),
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
        <div><b style="font-size:16px;color:var(--text)">Pixel Bro ${APP_VERSION}</b><br>Moderner Pixel-Art- und Animations-Editor auf Deutsch und Englisch</div>
      </div>
      <p>Entwickelt von <b style="color:var(--text)">Jens Niebisch</b><br>
        für <b style="color:var(--text)">Bro Kartell</b> – Multigaming Clan seit 2013</p>
      <p><a href="https://bro-kartell.com/pixel-bro.html" target="_blank" rel="noopener">Pixel Bro Homepage</a> ·
        <a href="https://bro-kartell.com/impressum.html" target="_blank" rel="noopener">Impressum</a></p>
      <p>Feedback &amp; Bugs: <a href="mailto:pixelbro@bro-kartell.com?subject=Pixel%20Bro%20Feedback" target="_blank" rel="noopener">pixelbro@bro-kartell.com</a></p>
      <p class="hint">© ${new Date().getFullYear()} <span>Jens Niebisch · Bro Kartell. Alle Rechte vorbehalten.</span><br>
        Projekte werden als <code>.pixelbro</code>-Datei gespeichert, die aktuelle Arbeit wird zusätzlich automatisch gesichert.</p>
      ${nativeApi ? `<p class="hint">${settings.autoUpdate
        ? 'Updates: Pixel Bro fragt beim Start bei GitHub nach einer neuen Version (abschaltbar unter Hilfe → Automatisch nach Updates suchen).'
        : 'Updates: Pixel Bro fragt nur auf Wunsch bei GitHub nach einer neuen Version (abschaltbar unter Hilfe → Automatisch nach Updates suchen).'}</p>` : ''}`,
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

/* ---------- Anleitung (Hilfe → Anleitung) ----------
   Eigenes großes Fenster mit Kapiteln links. Texte stehen hier auf Deutsch und Englisch
   (nicht im Wörterbuch – das Fenster ist data-i18n-skip). */
const GUIDE_TOOLS = {
  pen: ['Stift', 'Pen', 'Zeichnet Pixel. Pinselgröße oben einstellen, „Pixel-Perfect“ glättet Linien. Rechtsklick zeichnet mit der Zweitfarbe.', 'Draws pixels. Set the brush size at the top, “Pixel-Perfect” smooths lines. Right-click draws with the secondary color.'],
  eraser: ['Radierer', 'Eraser', 'Macht Pixel durchsichtig.', 'Makes pixels transparent.'],
  bucket: ['Füllen', 'Fill', 'Füllt eine Fläche mit der Farbe. „Zusammenhängend“ aus = alle Pixel dieser Farbe im Bild.', 'Fills an area. Turn off “Contiguous” to fill every pixel of that color.'],
  gradient: ['Verlauf', 'Gradient', 'Ziehen: Verlauf von Primär- zu Zweitfarbe in 2–16 Stufen, wahlweise mit Dithering. Füllt die Auswahl oder die Fläche.', 'Drag: gradient from primary to secondary color in 2–16 steps, optionally dithered. Fills the selection or area.'],
  picker: ['Pipette', 'Picker', 'Nimmt eine Farbe aus dem Bild. Geht auch jederzeit mit gedrückter Alt-Taste.', 'Picks a color from the image. Also works anytime by holding Alt.'],
  line: ['Linie', 'Line', 'Gerade Linie. Umschalt rastet in 45°-Schritten ein.', 'Straight line. Shift snaps to 45° steps.'],
  rect: ['Rechteck', 'Rectangle', 'Rahmen oder gefüllt (Schalter oben). Umschalt = Quadrat.', 'Outline or filled (toggle at the top). Shift = square.'],
  ellipse: ['Ellipse', 'Ellipse', 'Rahmen oder gefüllt. Umschalt = Kreis.', 'Outline or filled. Shift = circle.'],
  text: ['Text', 'Text', 'Pixel-Schrift mit Umlauten, Größe 1×–10×, Zeichenabstand einstellbar. Text lässt sich vor dem Festsetzen verschieben.', 'Pixel font with umlauts, size 1×–10×, adjustable spacing. Move the text before committing.'],
  select: ['Auswahl', 'Select', 'Rechteck auswählen. Umschalt erweitert, Strg zieht ab. Danach kopieren, ausschneiden, löschen oder verschieben.', 'Select a rectangle. Shift adds, Ctrl subtracts. Then copy, cut, delete or move.'],
  wand: ['Zauberstab', 'Magic wand', 'Wählt alle zusammenhängenden Pixel einer Farbe aus.', 'Selects all connected pixels of one color.'],
  move: ['Verschieben', 'Move', 'Verschiebt die Auswahl oder die ganze Ebene. Pfeiltasten = 1 Pixel, Enter bestätigt.', 'Moves the selection or the whole layer. Arrow keys = 1 pixel, Enter confirms.'],
  dither: ['Dithering', 'Dither', 'Malt ein Schachbrett aus Primär- und Zweitfarbe – für Übergänge und Schatten.', 'Paints a checkerboard of primary and secondary color – for blends and shading.'],
  spray: ['Sprühdose', 'Spray', 'Sprüht zufällige Pixel, Dichte oben einstellbar.', 'Sprays random pixels, density adjustable at the top.'],
  shade: ['Aufhellen / Abdunkeln', 'Lighten / darken', 'Macht vorhandene Pixel heller, mit Umschalt dunkler.', 'Makes existing pixels lighter, with Shift darker.'],
  hand: ['Hand', 'Hand', 'Verschiebt die Ansicht. Geht auch mit gedrückter Leertaste.', 'Pans the view. Also works by holding Space.'],
};
const GUIDE = [
  { id: 'start', de: 'Erste Schritte', en: 'Getting started',
    deBody: `<p class="gd-lead">Pixel Bro ist ein Editor für Pixel-Art, Animationen und Tilesets – mit einer Prüfung, die genau wie GB Studio rechnet.</p>
      <div class="gd-steps">
        <div><b>1</b><p><b>Neues Sprite</b> über Datei → Neues Sprite (Strg+N): Breite und Höhe in Pixeln, z. B. 16×16 für Figuren oder 160×144 für einen Game-Boy-Bildschirm.</p></div>
        <div><b>2</b><p><b>Zeichnen</b> mit den Werkzeugen links. Farben wählst du rechts unter „Farbe &amp; Palette“.</p></div>
        <div><b>3</b><p><b>Speichern</b> als Projekt (.pixelbro, Strg+S) – mit allen Ebenen und Frames. Fertige Bilder über <b>Exportieren</b> oben rechts.</p></div>
      </div>
      <h4>Tabs – mehrere Bilder gleichzeitig</h4>
      <ul><li>Jedes Bild öffnet sich in einem eigenen <b>Tab</b> über der Zeichenfläche – mit eigener Größe, eigenen Ebenen und eigenem Rückgängig</li>
        <li>Klick auf einen Tab wechselt das Bild (Strg+Tab), <b>+</b> oder Strg+T öffnet einen neuen Tab, × oder Strg+W schließt ihn</li>
        <li><b>Zwischen Bildern kopieren:</b> auswählen, Strg+C, Tab wechseln, Strg+V – z. B. ein Auto aus der Karthalle in den Außenbereich</li></ul>
      <h4>Zeichenfläche</h4>
      <ul><li>Mausrad zoomt, Umschalt + Mausrad scrollt waagerecht, Leertaste halten verschiebt</li>
        <li>„Einpassen“ oben rechts (Taste 0) zeigt das ganze Bild</li>
        <li>Raster, Mittellinien, Zwiebelhaut und Kachel-Modus schaltest du in der Leiste oben</li></ul>
      <h4>Sicherheit</h4>
      <ul><li>Pixel Bro sichert automatisch – nach einem Absturz ist die letzte Sitzung wieder da</li>
        <li>Rückgängig / Wiederholen mit Strg+Z / Strg+Y (bis zu 120 Schritte)</li>
        <li>Die Windows-Version aktualisiert sich selbst (Hilfe → Nach Updates suchen)</li></ul>`,
    enBody: `<p class="gd-lead">Pixel Bro is an editor for pixel art, animations and tilesets – with a check that calculates exactly like GB Studio.</p>
      <div class="gd-steps">
        <div><b>1</b><p><b>New sprite</b> via File → New sprite (Ctrl+N): width and height in pixels, e.g. 16×16 for characters or 160×144 for a Game Boy screen.</p></div>
        <div><b>2</b><p><b>Draw</b> with the tools on the left. Pick colors on the right under “Color &amp; palette”.</p></div>
        <div><b>3</b><p><b>Save</b> as a project (.pixelbro, Ctrl+S) – with all layers and frames. Finished images via <b>Export</b> at the top right.</p></div>
      </div>
      <h4>Tabs – several images at once</h4>
      <ul><li>Every image opens in its own <b>tab</b> above the canvas – with its own size, layers and undo</li>
        <li>Click a tab to switch (Ctrl+Tab), <b>+</b> or Ctrl+T opens a new tab, × or Ctrl+W closes it</li>
        <li><b>Copy between images:</b> select, Ctrl+C, switch tab, Ctrl+V – e.g. a kart from one map into another</li></ul>
      <h4>Canvas</h4>
      <ul><li>Mouse wheel zooms, Shift + wheel scrolls horizontally, hold Space to pan</li>
        <li>“Fit” at the top right (key 0) shows the whole image</li>
        <li>Grid, center lines, onion skin and tile mode are toggled in the bar at the top</li></ul>
      <h4>Safety</h4>
      <ul><li>Pixel Bro saves automatically – after a crash your last session is back</li>
        <li>Undo / redo with Ctrl+Z / Ctrl+Y (up to 120 steps)</li>
        <li>The Windows version updates itself (Help → Check for updates)</li></ul>` },
  { id: 'tools', de: 'Werkzeuge', en: 'Tools', tools: true,
    deBody: '<p class="gd-lead">Alle Werkzeuge links in der Leiste. Der Buchstabe ist die Taste dafür.</p>',
    enBody: '<p class="gd-lead">All tools are in the bar on the left. The letter is its shortcut key.</p>' },
  { id: 'colors', de: 'Farben & Paletten', en: 'Colors & palettes',
    deBody: `<ul><li><b>Primär- und Zweitfarbe</b> unten links – Linksklick malt mit der Primär-, Rechtsklick mit der Zweitfarbe. X tauscht beide</li>
        <li><b>HEX und Deckkraft</b> rechts unter „Farbe &amp; Palette“</li>
        <li><b>Paletten-Vorlagen:</b> Bro 32, PICO-8, Endesga 32, Sweetie 16, Game Boy, GB Studio (Sprites / Hintergründe), Graustufen</li>
        <li><b>Eigene Paletten:</b> bis zu 20 mit Namen – neu anlegen, umbenennen, löschen oder „aus dem Bild“ übernehmen</li>
        <li><b>Benutzte Farben:</b> zeigt automatisch alle Farben im Bild. <b>Doppelklick</b> auf eine Farbe ersetzt sie überall – mit HEX-Feld (Strg+V geht) und allen Bildfarben zum Anklicken</li></ul>`,
    enBody: `<ul><li><b>Primary and secondary color</b> at the bottom left – left-click paints with the primary, right-click with the secondary. X swaps them</li>
        <li><b>HEX and opacity</b> on the right under “Color &amp; palette”</li>
        <li><b>Palette presets:</b> Bro 32, PICO-8, Endesga 32, Sweetie 16, Game Boy, GB Studio (sprites / backgrounds), grayscale</li>
        <li><b>Custom palettes:</b> up to 20 with names – create, rename, delete or take them “from the image”</li>
        <li><b>Used colors:</b> shows every color in the image. <b>Double-click</b> a color to replace it everywhere – with a HEX field (Ctrl+V works) and all image colors to pick from</li></ul>` },
  { id: 'anim', de: 'Ebenen & Animation', en: 'Layers & animation',
    deBody: `<h4>Ebenen</h4>
      <ul><li>Hinzufügen, duplizieren, sortieren, zusammenführen, ausblenden, umbenennen (Doppelklick) und Deckkraft</li>
        <li>Ebene 1 liegt unten – z. B. Hintergrund unten, Figur darüber</li></ul>
      <h4>Frames</h4>
      <ul><li>Unten in der Zeitleiste: + neuer Frame (N), duplizieren (Umschalt+N), löschen, per Drag &amp; Drop sortieren</li>
        <li><b>Vorschau</b> rechts oben spielt die Animation ab, FPS einstellbar. Mausrad zoomt bis 32×, Ziehen verschiebt, Doppelklick zeigt wieder alles</li>
        <li><b>Zwiebelhaut</b> zeigt den vorherigen und nächsten Frame durchscheinend</li></ul>`,
    enBody: `<h4>Layers</h4>
      <ul><li>Add, duplicate, reorder, merge, hide, rename (double-click) and opacity</li>
        <li>Layer 1 is at the bottom – e.g. background below, character above</li></ul>
      <h4>Frames</h4>
      <ul><li>In the timeline: + new frame (N), duplicate (Shift+N), delete, reorder by drag &amp; drop</li>
        <li>The <b>preview</b> at the top right plays the animation, FPS adjustable. Mouse wheel zooms up to 32×, drag pans, double-click shows everything</li>
        <li><b>Onion skin</b> shows the previous and next frame see-through</li></ul>` },
  { id: 'image', de: 'Bild & Ansicht', en: 'Image & view',
    deBody: `<h4>Bild-Menü</h4>
      <ul><li>Größe ändern (Strg+R) – Leinwand vergrößern oder Bild skalieren</li>
        <li>Spiegeln (Umschalt+H / Umschalt+V), 90° drehen (Umschalt+R) – ist etwas ausgewählt oder eingefügt, gilt es nur für die Auswahl (z. B. kopierten Stuhl drehen)</li>
        <li>Farbe ersetzen in allen Frames, Umriss hinzufügen, Ebene leeren</li></ul>
      <h4>Hilfen beim Zeichnen</h4>
      <ul><li><b>Spiegel ↔ / ↕</b>: zeichnet gleichzeitig gespiegelt – ideal für symmetrische Figuren</li>
        <li><b>Raster</b> (#) zeigt jeden Pixel, <b>Kachelraster</b> (Ansicht) z. B. alle 8 Pixel für Game-Boy-Kacheln</li>
        <li><b>Kachel-Modus</b> (T) zeigt das Bild 3×3 – zum nahtlosen Zeichnen von Mustern</li>
        <li><b>Mittellinien</b> (Umschalt+M) durch die Bildmitte</li>
        <li>Helles / dunkles Design und Deutsch / English unter Ansicht</li></ul>`,
    enBody: `<h4>Image menu</h4>
      <ul><li>Resize (Ctrl+R) – enlarge the canvas or scale the image</li>
        <li>Flip (Shift+H / Shift+V), rotate 90° (Shift+R) – with a selection or pasted object, only that is flipped or rotated</li>
        <li>Replace color in all frames, add outline, clear layer</li></ul>
      <h4>Drawing helpers</h4>
      <ul><li><b>Mirror ↔ / ↕</b>: draws mirrored at the same time – great for symmetric characters</li>
        <li><b>Grid</b> (#) shows every pixel, <b>tile grid</b> (View) e.g. every 8 pixels for Game Boy tiles</li>
        <li><b>Tile mode</b> (T) shows the image 3×3 – for drawing seamless patterns</li>
        <li><b>Center lines</b> (Shift+M) through the middle of the image</li>
        <li>Light / dark theme and Deutsch / English under View</li></ul>` },
  { id: 'io', de: 'Import & Export', en: 'Import & export',
    deBody: `<h4>Importieren</h4>
      <ul><li>Datei → Bild importieren (Strg+I) oder Bild einfach ins Fenster ziehen</li>
        <li>Als <b>neues Sprite</b>, als <b>neue Ebene</b> oder <b>Spritesheet → Frames</b> (Frame-Größe angeben)</li>
        <li>Projekte (.pixelbro) öffnen mit Strg+O oder per Doppelklick im Explorer</li></ul>
      <h4>Exportieren</h4>
      <ul><li><b>Exportieren</b> oben rechts – Umschalter <b>PNG · Spritesheet · GIF</b>, das letzte Format wird gemerkt</li>
        <li><b>PNG:</b> aktueller Frame, wahlweise vergrößert (Skalierung)</li>
        <li><b>Spritesheet:</b> alle Frames in einem Bild – nebeneinander, untereinander oder als Raster</li>
        <li><b>GIF:</b> animiert mit der FPS aus der Vorschau</li></ul>`,
    enBody: `<h4>Import</h4>
      <ul><li>File → Import image (Ctrl+I) or simply drag an image into the window</li>
        <li>As a <b>new sprite</b>, as a <b>new layer</b> or <b>spritesheet → frames</b> (enter the frame size)</li>
        <li>Open projects (.pixelbro) with Ctrl+O or by double-clicking in Explorer</li></ul>
      <h4>Export</h4>
      <ul><li><b>Export</b> at the top right – switch between <b>PNG · Spritesheet · GIF</b>, the last format is remembered</li>
        <li><b>PNG:</b> current frame, optionally enlarged (scale)</li>
        <li><b>Spritesheet:</b> all frames in one image – in a row, a column or a grid</li>
        <li><b>GIF:</b> animated with the FPS from the preview</li></ul>` },
  { id: 'gb', de: 'GB-Studio-Prüfung', en: 'GB Studio check', star: true,
    deBody: `<p class="gd-lead">Das Herzstück für Game-Boy-Projekte: Bild → <b>GB-Studio-Paletten prüfen</b> (Umschalt+G). Pixel Bro rechnet dabei <b>genau wie GB Studio</b> – du siehst vor dem Import, ob alles passt.</p>
      <div class="gd-cards">
        <div><h5>Game Boy Color</h5><p>Jede 8×8-Kachel nutzt eine Palette mit 4 Farben. 7 Paletten sind frei, die 8. ist für Text und Menüs. Höchstens 384 verschiedene Kacheln.</p></div>
        <div><h5>Game Boy (klassisch)</h5><p>Nur 4 Helligkeitsstufen. Leicht abweichende Farben ordnet GB Studio selbst richtig zu – Pixel Bro zeigt „wird zu …“. Höchstens 192 Kacheln.</p></div>
      </div>
      <h4>So liest du das Ergebnis</h4>
      <ul><li><b>Grün „Passt in GB Studio“</b> – fertig. <b>Rot</b> – darunter steht genau, was nicht passt</li>
        <li><b>Paletten und Kacheln</b> werden aufgeteilt und gezählt wie in GB Studio („Automatisch“, gespiegelte Kacheln zählen einmal)</li>
        <li><b>8 Paletten:</b> GB Studio warnt erst ab 9 und ersetzt still eine Palette durch deine Palette 8. Pixel Bro markiert sie rot und zeigt „In GB Studio: Farbe → Farbe“</li>
        <li><b>Palette 8 (Text/UI)</b> deiner Szene unten eintragen – jeder nutzt eine andere. Sind die Farben fast gleich, passt es trotzdem</li>
        <li><b>Mehr als 4 Farben</b> in einer Kachel: Die überzähligen Pixel sind im Bild rot markiert</li></ul>
      <h4>Direkt korrigieren</h4>
      <ul><li><b>Übernehmen</b> bei geprüften Tipps – Pixel Bro rechnet jeden Farbtausch vorher durch und schlägt nur vor, was wirklich auf 7 bringt</li>
        <li><b>Wie GB Studio übernehmen</b> färbt überzählige Pixel so um, wie GB Studio es tun würde. <b>Angleichen</b> setzt im klassischen Modus die genauen 4 Farben</li>
        <li>Alles lässt sich mit Strg+Z rückgängig machen</li></ul>
      <h4>Im Bild</h4>
      <ul><li><b>Im Bild zeigen</b>: jede Kachel mit ihrer Palettennummer, „6+“ = passt auch in andere Paletten</li>
        <li>Oben links die Übersicht: <b>Klick auf eine Nummer</b> zeigt nur die Kacheln dieser Palette, Klick auf eine Farbe nimmt sie als Zeichenfarbe</li>
        <li><b>Paletten speichern</b> legt alle Paletten als eigene Paletten an</li></ul>`,
    enBody: `<p class="gd-lead">The heart of Game Boy projects: Image → <b>Check GB Studio palettes</b> (Shift+G). Pixel Bro calculates <b>exactly like GB Studio</b> – you know before importing whether everything fits.</p>
      <div class="gd-cards">
        <div><h5>Game Boy Color</h5><p>Every 8×8 tile uses one palette with 4 colors. 7 palettes are free, the 8th is for text and menus. At most 384 different tiles.</p></div>
        <div><h5>Game Boy (classic)</h5><p>Only 4 brightness levels. GB Studio maps slightly different colors correctly – Pixel Bro shows “becomes …”. At most 192 tiles.</p></div>
      </div>
      <h4>Reading the result</h4>
      <ul><li><b>Green “Ready for GB Studio”</b> – done. <b>Red</b> – below it says exactly what does not fit</li>
        <li><b>Palettes and tiles</b> are split and counted like GB Studio (“Automatic”, flipped tiles count once)</li>
        <li><b>8 palettes:</b> GB Studio only warns from 9 and silently replaces one palette with your palette 8. Pixel Bro marks it red and shows “In GB Studio: color → color”</li>
        <li>Enter your scene's <b>palette 8 (text/UI)</b> at the bottom – everyone uses a different one. If the colors are almost the same, it still fits</li>
        <li><b>More than 4 colors</b> in a tile: the extra pixels are marked red in the image</li></ul>
      <h4>Fix it right away</h4>
      <ul><li><b>Apply</b> on verified tips – Pixel Bro calculates every color swap first and only suggests what really gets you to 7</li>
        <li><b>Apply like GB Studio</b> recolors extra pixels the way GB Studio would. <b>Match</b> sets the exact 4 colors in classic mode</li>
        <li>Everything can be undone with Ctrl+Z</li></ul>
      <h4>In the image</h4>
      <ul><li><b>Show in image</b>: every tile with its palette number, “6+” = fits other palettes too</li>
        <li>Overview at the top left: <b>click a number</b> to show only that palette's tiles, click a color to draw with it</li>
        <li><b>Save palettes</b> adds all palettes as custom palettes</li></ul>` },
];

async function showGuide(startId) {
  const en = settings.lang === 'en';
  const toolGrid = () => `<div class="gd-tools">${Object.entries(GUIDE_TOOLS).map(([id, [nde, nen, dde, den]]) => {
    const btn = document.querySelector(`.tool[data-tool="${id}"]`);
    const svg = btn ? btn.querySelector('svg').outerHTML : '';
    const key = btn ? ((btn.title.match(/\(([^)]+)\)/) || [])[1] || '') : '';
    return `<div class="gd-tool"><span class="gd-ticon">${svg}</span><div><b>${en ? nen : nde}</b>${key ? `<kbd>${key}</kbd>` : ''}<p>${en ? den : dde}</p></div></div>`;
  }).join('')}</div>`;
  const body = el(`<div class="gd" data-i18n-skip>
      <nav class="gd-nav">${GUIDE.map((c) => `<button type="button" data-id="${c.id}">${c.star ? '★ ' : ''}${en ? c.en : c.de}</button>`).join('')}
</nav>
      <div class="gd-page"></div></div>`);
  const page = body.querySelector('.gd-page');
  const show = (id) => {
    const c = GUIDE.find((x) => x.id === id) || GUIDE[0];
    body.querySelectorAll('.gd-nav [data-id]').forEach((b) => b.classList.toggle('active', b.dataset.id === c.id));
    page.innerHTML = `<h3>${c.star ? '<span class="gd-star">★</span>' : ''}${en ? c.en : c.de}</h3>${en ? c.enBody : c.deBody}${c.tools ? toolGrid() : ''}`;
    page.scrollTop = 0;
  };
  body.querySelectorAll('.gd-nav [data-id]').forEach((b) => b.onclick = () => show(b.dataset.id));
  show(startId || 'start');
  await modal({ title: en ? 'Pixel Bro – Guide' : 'Pixel Bro – Anleitung', body, actions: [{ label: 'Schließen', value: false, id: 'gd-close', primary: true }], wide: 'xl' });
}

function showShortcuts() {
  const rows = [
    ['B / E / G / I', 'Stift / Radierer / Füllen / Pipette'],
    ['L / R / O', 'Linie / Rechteck / Ellipse'],
    ['M / W / V', 'Auswahl / Zauberstab / Verschieben'],
    ['D / U / H', 'Dithering / Aufhellen-Abdunkeln / Hand'],
    ['J / K / S', 'Verlauf / Text / Sprühdose'],
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
    ['Strg+T / Strg+W', 'Neuer Tab / Tab schließen'],
    ['Strg+Tab', 'Zum nächsten Tab'],
    ['Pfeiltasten', 'Auswahl um 1 px verschieben'],
    ['Enter / Esc', 'Verschieben bestätigen / Auswahl aufheben'],
    ['T', 'Kachel-Modus'],
    ['#', 'Pixelraster'],
    ['Umschalt+M', 'Mittellinien'],
    ['Umschalt+G', 'GB-Studio-Paletten prüfen'],
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
const TOOL_KEYS = { b: 'pen', p: 'pen', e: 'eraser', g: 'bucket', i: 'picker', l: 'line', r: 'rect', o: 'ellipse', m: 'select', w: 'wand', v: 'move', d: 'dither', u: 'shade', h: 'hand', j: 'gradient', s: 'spray', k: 'text' };
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input[type="text"], input[type="number"], select')) return;
  if (!$('#modal-backdrop').hidden) return;
  const k = e.key.toLowerCase();
  shiftDown = e.shiftKey;
  if (e.key === 'Alt') { e.preventDefault(); altDown = true; updateCursor(); return; }
  if (e.key === ' ') { e.preventDefault(); if (!spaceDown) { spaceDown = true; updateCursor(); } return; }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'Tab') { e.preventDefault(); return run(e.shiftKey ? 'tab-prev' : 'tab-next'); }
    const map = { t: 'tab-new', w: 'tab-close', z: e.shiftKey ? 'redo' : 'undo', y: 'redo', s: e.shiftKey ? 'save-as' : 'save', o: 'open', n: 'new', i: 'import', e: 'export-png', g: 'export-gif', c: 'copy', x: 'cut', v: 'paste', a: 'select-all', d: 'deselect', r: 'resize' };
    if (map[k]) { e.preventDefault(); run(map[k]); }
    return;
  }
  if (e.shiftKey) {
    const map = { h: 'flip-h', v: 'flip-v', r: 'rotate', n: 'frame-dup', o: 'toggle-onion', m: 'toggle-center', g: 'gb-palettes' };
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
$('#opt-center').addEventListener('change', (e) => { settings.center = e.target.checked; saveSettings(); syncMenuChecks(); requestRender(); });
$('#grad-steps').addEventListener('input', (e) => { settings.gradSteps = +e.target.value; $('#grad-steps-val').textContent = settings.gradSteps; saveSettings(); });
$('#opt-grad-dither').addEventListener('change', (e) => { settings.gradDither = e.target.checked; saveSettings(); });
$('#spray-density').addEventListener('input', (e) => { settings.sprayDensity = +e.target.value; $('#spray-density-val').textContent = settings.sprayDensity; saveSettings(); });
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
$('#palette-select').addEventListener('change', (e) => selectPalette(e.target.value));
$('#pal-new').addEventListener('click', newPaletteDialog);
$('#pal-rename').addEventListener('click', renamePaletteDialog);
$('#pal-delete').addEventListener('click', deletePaletteDialog);
$('#pal-add').addEventListener('click', () => {
  if (isLivePalette()) settings.palette = settings.palette.slice(); // wird zur eigenen Palette
  if (settings.palette.includes(settings.primary)) return toast('Farbe ist bereits in der Palette');
  settings.palette.push(settings.primary);
  paletteEdited();
});
$('#pal-from-image').addEventListener('click', paletteFromImageDialog);
$('#gb-hud-open').addEventListener('click', gbPaletteDialog);
$('#gb-hud-close').addEventListener('click', () => setGbView(false));
$('#gb-legend').addEventListener('click', (e) => {
  if (e.target.closest('.gb-lnums')) {
    settings.gbLabels = settings.gbLabels === false; saveSettings();
    updateGbHud(); requestRender();
    return;
  }
  const pick = e.target.closest('.gb-lpick');
  if (pick || e.target.closest('.gb-lall')) {
    const i = pick ? +pick.dataset.pal : -1;
    gbView.filter = gbView.filter === i ? -1 : i;
    updateGbHud(); requestRender();
    return;
  }
  const b = e.target.closest('.gb-lsw[data-c]'); if (!b) return;
  settings.primary = +b.dataset.c >>> 0; updateColorUI(); saveSettings();
});
$('#gb-legend').addEventListener('contextmenu', (e) => {
  const b = e.target.closest('.gb-lsw[data-c]'); if (!b) return;
  e.preventDefault();
  settings.secondary = +b.dataset.c >>> 0; updateColorUI(); saveSettings();
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
  autosaveNow(); // letzte Striche sofort sichern, nicht erst nach der Wartezeit
  if (dirty || tabs.some((tb, i) => i !== activeTab && tb && tb.dirty)) { e.preventDefault(); e.returnValue = ''; }
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
      if (st.manual) toast(t('Pixel Bro ist aktuell (Version {v})', { v: st.version }));
      break;
    case 'error':
      if (st.manual) toast(t('Update-Suche fehlgeschlagen: {msg}', { msg: st.message }));
      break;
    case 'downloading':
      if (st.version) updateBanner.dataset.version = st.version;
      showUpdateBanner({
        title: updateBanner.dataset.version ? t('Update {v} wird geladen …', { v: updateBanner.dataset.version }) : 'Update wird geladen …',
        text: 'Du kannst einfach weiterarbeiten.',
        progress: st.percent || 0,
      });
      break;
    case 'ready':
      updateDismissed = false;
      showUpdateBanner({
        title: t('Version {v} ist bereit', { v: st.version }),
        text: 'Deine Arbeit wird vorher gesichert. „Später“ installiert beim Schließen.',
        actions: [
          { label: 'Jetzt neu starten', primary: true, onClick: installUpdateNow },
          { label: 'Später', onClick: () => hideUpdateBanner(true) },
        ],
      });
      break;
    case 'available-manual':
      showUpdateBanner({
        title: t('Version {v} ist da', { v: st.version }),
        text: st.kind === 'portable'
          ? 'Neue portable Version herunterladen und die alte Datei ersetzen.'
          : 'Tipp: Mit dem Installer aktualisiert sich Pixel Bro selbst.',
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
  $('#brand-version').textContent = 'v' + APP_VERSION;
  $('#brand-version').title = 'Version ' + APP_VERSION;
  loadSettings();
  I18N.set(settings.lang);
  if (nativeApi && nativeApi.setLanguage) nativeApi.setLanguage(settings.lang);
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
  $('#opt-center').checked = settings.center;
  $('#grad-steps').value = settings.gradSteps; $('#grad-steps-val').textContent = settings.gradSteps;
  $('#opt-grad-dither').checked = settings.gradDither;
  $('#spray-density').value = settings.sprayDensity; $('#spray-density-val').textContent = settings.sprayDensity;
  setBrushSize(settings.size);

  let restored = false;
  try {
    const a = JSON.parse(localStorage.getItem('pixelbro.autosave') || 'null');
    const list = a ? (a.tabs || (a.data ? [{ name: a.name, path: a.path, data: a.data }] : [])) : [];
    for (const s of list) {
      try {
        const d = deserialize(s.data).doc;
        tabs.push({ doc: d, cur: { layer: d.layers.length - 1, frame: 0 }, fileInfo: { path: s.path || null, name: s.name || 'unbenannt' },
          dirty: !!s.dirty, undo: [], redo: [], sel: null, view: null });
      } catch (e) { /* kaputten Tab überspringen */ }
    }
    if (tabs.length) {
      activeTab = Math.min(Math.max(0, a.active || 0), tabs.length - 1);
      const tb = tabs[activeTab];
      doc = tb.doc; cur = { ...tb.cur }; fileInfo = { ...tb.fileInfo }; dirty = tb.dirty;
      restored = true;
    }
  } catch (e) { /* ignorieren */ }
  if (!restored) { doc = createDoc(32, 32); tabs.push(null); activeTab = 0; }

  syncDocUI();
  renderPalette();
  renderRecent();
  setTool(settings.tool in TOOL_NAMES ? settings.tool : 'pen');
  syncMenuChecks();
  updateTitle();
  requestAnimationFrame(() => { zoomFit(); afterStructureChange(); });
  requestAnimationFrame(previewLoop);
  if (restored) setTimeout(() => toast(tabs.length > 1 ? t('Letzte Sitzung wiederhergestellt ({n} Tabs)', { n: tabs.length }) : 'Letzte Sitzung wiederhergestellt'), 400);

  if (nativeApi && nativeApi.onOpenPath) {
    nativeApi.onOpenPath((path, data) => loadProject(new TextDecoder().decode(data), path.split(/[\\/]/).pop(), path));
  }

  // Schließen-Dialog → „Speichern …“: erst speichern, dann schließen
  if (nativeApi && nativeApi.onSaveAndClose) {
    nativeApi.onSaveAndClose(async () => {
      // alle Tabs mit ungespeicherten Änderungen nacheinander speichern
      for (let i = 0; i < tabs.length; i++) {
        const isDirty = i === activeTab ? dirty : tabs[i] && tabs[i].dirty;
        if (!isDirty) continue;
        switchTab(i);
        if (!(await saveProject(false))) return;
      }
      window.close();
    });
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
