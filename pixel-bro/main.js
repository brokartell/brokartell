'use strict';
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const updater = require('./updater');

let win = null;

function fileFromArgs(argv) {
  return argv.slice(1).find((a) => /\.pixelbro$/i.test(a)) || null;
}

async function sendOpenPath(p) {
  if (!win || !p) return;
  try {
    const data = await fs.readFile(p);
    win.webContents.send('open-path', p, new Uint8Array(data));
  } catch (e) { /* Datei nicht lesbar */ }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    title: 'Pixel Bro',
    backgroundColor: '#0f1117',
    icon: path.join(__dirname, 'src', 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.once('did-finish-load', () => sendOpenPath(fileFromArgs(process.argv)));
  updater.init(win);

  // Ungespeicherte Änderungen beim Schließen abfragen
  win.webContents.on('will-prevent-unload', (e) => {
    // Beim Neustart fürs Update nicht nachfragen – die Arbeit wurde vorher automatisch gesichert
    if (updater.isQuittingForUpdate()) { e.preventDefault(); return; }
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Ohne Speichern schließen', 'Abbrechen'],
      defaultId: 1,
      cancelId: 1,
      title: 'Ungespeicherte Änderungen',
      message: 'Es gibt ungespeicherte Änderungen.',
      detail: 'Deine Arbeit wird automatisch gesichert und beim nächsten Start wiederhergestellt. Trotzdem schließen?',
    });
    if (choice === 0) e.preventDefault();
  });

  // Externe Links im Standardbrowser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

ipcMain.handle('save-file', async (_e, { defaultPath, filters, data, path: target }) => {
  let p = target;
  if (!p) {
    const r = await dialog.showSaveDialog(win, { defaultPath, filters });
    if (r.canceled || !r.filePath) return null;
    p = r.filePath;
  }
  await fs.writeFile(p, Buffer.from(data));
  return p;
});

ipcMain.handle('open-file', async (_e, { filters }) => {
  const r = await dialog.showOpenDialog(win, { filters, properties: ['openFile'] });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  const data = await fs.readFile(p);
  return { path: p, name: path.basename(p), data: new Uint8Array(data) };
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
    sendOpenPath(fileFromArgs(argv));
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
