// Test für Windows (läuft im GitHub-Test-Build): startet ein Zielprogramm über den
// Wartezeit-Helfer aus updater.js und prüft Wartezeit und Argumente.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

// updater.js erwartet Electron – für den Test reicht ein Platzhalter
const load = Module._load;
Module._load = function (req, ...rest) {
  if (req === 'electron') return { app: { isPackaged: true, getVersion: () => '0.0.0' }, ipcMain: { handle() {} }, net: {}, shell: {} };
  return load.call(this, req, ...rest);
};
const { spawnDelayed } = require('../updater.js');

// Ordner mit Leerzeichen, wie C:\Users\Vorname Nachname\...
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel bro test '));
const out = path.join(dir, 'ergebnis.json');
const target = path.join(dir, 'ziel programm.js');
fs.writeFileSync(target, `require('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify({ args: process.argv.slice(2), t: Date.now() }));`);

const start = Date.now();
spawnDelayed(process.execPath, [target, '--updated', '/S', '--force-run', `--package-file=${path.join(dir, 'paket datei.7z')}`])
  .then(() => {
    const timer = setInterval(() => {
      if (fs.existsSync(out)) {
        clearInterval(timer);
        const r = JSON.parse(fs.readFileSync(out, 'utf8'));
        const waited = (r.t - start) / 1000;
        console.log('Argumente:', r.args, '· gewartet:', waited.toFixed(1), 's');
        const expected = ['--updated', '/S', '--force-run', `--package-file=${path.join(dir, 'paket datei.7z')}`];
        if (JSON.stringify(r.args) !== JSON.stringify(expected)) { console.error('FEHLER: Argumente falsch, erwartet', expected); process.exit(1); }
        if (waited < 2.5) { console.error('FEHLER: zu kurz gewartet'); process.exit(1); }
        console.log('OK: Installer wird verzögert und mit den richtigen Argumenten gestartet');
        process.exit(0);
      }
      if (Date.now() - start > 20000) { console.error('FEHLER: Zielprogramm wurde nicht gestartet'); process.exit(1); }
    }, 200);
  })
  .catch((e) => { console.error('FEHLER beim Starten:', e); process.exit(1); });
