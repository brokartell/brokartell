'use strict';
/*
 * Updates für Pixel Bro
 * - Installierte Version (Setup): lädt Updates selbst herunter und installiert sie nach einem Klick
 *   auf „Jetzt neu starten“ (oder automatisch beim Schließen).
 * - Portable EXE / ZIP: können sich nicht selbst austauschen – sie zeigen nur einen Hinweis mit Download-Link.
 * Quelle ist immer das neueste GitHub-Release (Datei latest.yml).
 */
const { app, ipcMain, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const FEED = (!app.isPackaged && process.env.PIXELBRO_UPDATE_URL)
  || 'https://github.com/brokartell/brokartell/releases/latest/download';
const DOWNLOAD_PAGE = 'https://bro-kartell.com/pixel-bro.html';

let win = null;
let autoUpdater = null;     // electron-updater, nur für die installierte Version
let checking = false;
let manualCheck = false;
let readyVersion = null;
let quittingForUpdate = false;

/** Wie läuft Pixel Bro gerade? installed | portable | zip | dev */
function installKind() {
  if (!app.isPackaged) return process.env.PIXELBRO_UPDATE_KIND || 'dev';
  if (process.env.PORTABLE_EXECUTABLE_DIR) return 'portable';
  try {
    const dir = path.dirname(process.execPath);
    if (fs.readdirSync(dir).some((f) => /^Uninstall .*\.exe$/i.test(f))) return 'installed';
  } catch (e) { /* ignorieren */ }
  return 'zip';
}

function send(status) {
  if (win && !win.isDestroyed()) win.webContents.send('update-status', status);
}

/** Vergleicht Versionen wie 1.2.10 und 1.2.9. Ergebnis > 0, wenn a neuer ist. */
function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

async function fetchLatestVersion() {
  const res = await net.fetch(`${FEED}/latest.yml?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Update-Infos nicht gefunden (HTTP ${res.status})`);
  const text = await res.text();
  const m = text.match(/^version:\s*['"]?([0-9][^\s'"]*)/m);
  if (!m) throw new Error('Update-Infos sind unvollständig');
  return m[1];
}

/*
 * Wartezeit vor dem Installer (Windows)
 * electron-updater startet den Installer genau in dem Moment, in dem Pixel Bro sich beendet.
 * Dann laufen oft noch Teile des Programms (oder ein Virenscanner prüft die Dateien) und der
 * Deinstaller der alten Version meldet „Die alten Anwendungsdateien konnten nicht deinstalliert
 * werden …: 2“. Deshalb startet ein unsichtbarer Helfer den Installer erst nach ein paar Sekunden.
 */
const INSTALL_DELAY_SECONDS = 3;

/** Ein Argument für die Windows-Kommandozeile – Anführungszeichen nur, wenn nötig (NSIS erkennt "/S" sonst nicht). */
function winArg(a) {
  a = String(a);
  if (/^\/D=/i.test(a)) return a;                 // NSIS: /D= muss ohne Anführungszeichen am Ende stehen
  return /[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a;
}
/** Baut den Befehl: erst warten, dann den Installer starten. */
function delayedInstallCommand(cmd, args, seconds = INSTALL_DELAY_SECONDS) {
  const wait = `ping -n ${seconds + 1} 127.0.0.1 >nul`;
  return `${wait} & "${cmd}" ${args.map(winArg).join(' ')}`.trim();
}
function spawnDelayed(cmd, args = [], env = undefined) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    try {
      const line = delayedInstallCommand(cmd, args);
      const p = spawn('cmd.exe', ['/d', '/s', '/c', `"${line}"`], {
        detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true, env,
      });
      p.on('error', reject);
      p.unref();
      if (p.pid !== undefined) resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

function setupAutoUpdater() {
  if (autoUpdater) return autoUpdater;
  ({ autoUpdater } = require('electron-updater'));
  if (process.platform === 'win32' && typeof autoUpdater.spawnLog === 'function') {
    // Installer (auch über elevate.exe) erst nach kurzer Wartezeit starten – gilt für
    // „Jetzt neu starten“ und für „Später“ (Installation beim Schließen)
    autoUpdater.spawnLog = (cmd, args = [], env = undefined) => spawnDelayed(cmd, args, env);
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;  // „Später“ → wird beim Schließen installiert
  autoUpdater.allowDowngrade = false;
  autoUpdater.logger = null;
  autoUpdater.setFeedURL({ provider: 'generic', url: FEED });

  autoUpdater.on('update-available', (info) => send({ state: 'downloading', version: info.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => send({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-not-available', () => {
    checking = false;
    send({ state: 'none', manual: manualCheck, version: app.getVersion() });
  });
  autoUpdater.on('update-downloaded', (info) => {
    checking = false;
    readyVersion = info.version;
    send({ state: 'ready', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    checking = false;
    send({ state: 'error', manual: manualCheck, message: friendlyError(err) });
  });
  return autoUpdater;
}

function friendlyError(err) {
  const msg = String((err && err.message) || err || '');
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|net::/i.test(msg)) return 'Keine Internetverbindung';
  if (/404/.test(msg)) return 'Update-Infos nicht gefunden';
  return msg.split('\n')[0].slice(0, 160) || 'Unbekannter Fehler';
}

async function check(manual) {
  manualCheck = !!manual;
  if (readyVersion) { send({ state: 'ready', version: readyVersion }); return; }
  if (checking) return;
  checking = true;
  send({ state: 'checking', manual: manualCheck });
  const kind = installKind();
  try {
    if (kind === 'installed') {
      const result = await setupAutoUpdater().checkForUpdates();
      if (!result) { // z. B. Prüfung übersprungen – nicht in „prüft noch“ hängen bleiben
        checking = false;
        send({ state: 'none', manual: manualCheck, version: app.getVersion() });
      }
      return; // sonst kommt das Ergebnis über die Ereignisse oben
    }
    const latest = await fetchLatestVersion();
    checking = false;
    if (compareVersions(latest, app.getVersion()) > 0) {
      send({ state: 'available-manual', version: latest, url: DOWNLOAD_PAGE, kind });
    } else {
      send({ state: 'none', manual: manualCheck, version: app.getVersion() });
    }
  } catch (err) {
    checking = false;
    send({ state: 'error', manual: manualCheck, message: friendlyError(err) });
  }
}

function init(mainWindow) {
  win = mainWindow;
}

ipcMain.handle('update-info', () => ({ kind: installKind(), version: app.getVersion() }));
ipcMain.handle('update-check', (_e, manual) => { check(manual); return true; });
ipcMain.handle('update-install', () => {
  if (!readyVersion || !autoUpdater) return false;
  quittingForUpdate = true;
  // still installieren und Pixel Bro danach wieder starten
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return true;
});
ipcMain.handle('update-open-download', () => shell.openExternal(DOWNLOAD_PAGE));

module.exports = {
  init,
  isQuittingForUpdate: () => quittingForUpdate,
  compareVersions,
  delayedInstallCommand, // für Tests
  spawnDelayed,          // für Tests
};
