# Pixel Bro

Moderner Pixel-Art- und Animations-Editor für Windows – auf Deutsch, umschaltbar auf Englisch.
Inspiriert von Tools wie Piskel und Pyxel Edit, aber mit frischer, dunkler (oder heller) Oberfläche.

## Funktionen

- **Werkzeuge:** Stift (mit Pixel-Perfect), Radierer, Füllen, Pipette, Linie, Rechteck, Ellipse,
  Auswahl, Zauberstab, Verschieben, Dithering, Aufhellen/Abdunkeln, Hand, Verlauf (mit Dithering),
  Sprühdose, Text (5-px-Pixel-Schrift)
- **Zeichnen:** Pinselgröße 1–16 px, Spiegel-Zeichnen horizontal/vertikal, Rechtsklick = Sekundärfarbe
- **Ebenen:** hinzufügen, duplizieren, sortieren, zusammenführen, ein-/ausblenden, Deckkraft, umbenennen
- **Animation:** Frames hinzufügen/duplizieren/löschen, per Drag & Drop sortieren, Live-Vorschau mit FPS, Zwiebelhaut
- **Tiles:** Kachel-Modus (nahtloses Zeichnen mit 3×3-Vorschau) und einstellbares Kachelraster
- **Farben:** Live-Palette „Benutzte Farben“ (erkennt alle Farben im Sprite, Doppelklick ersetzt eine Farbe überall), Paletten (Bro 32, PICO-8, Endesga 32, Sweetie 16, Game Boy, GB Studio – Sprites, GB Studio – Hintergründe, Graustufen), bis zu 20 eigene Paletten mit Namen,
  Palette aus Bild, Deckkraft, zuletzt benutzte Farben
- **Bild:** Größe ändern / skalieren, spiegeln, drehen, Farbe ersetzen, Umriss hinzufügen
- **Import:** PNG/JPG/GIF als neues Sprite, als Ebene oder Spritesheet in Frames zerlegen
- **Export:** PNG (skaliert), Spritesheet (horizontal/vertikal/Raster), animiertes GIF
- **Projekte:** `.pixelbro`-Dateien, Doppelklick im Explorer öffnet sie, automatische Sicherung
- **Ansicht:** Pixelraster, Mittellinien, Kachelraster, Zwiebelhaut, helles/dunkles Design
- **Sprachen:** Deutsch und Englisch (Ansicht → English), Wörterbuch in `src/i18n.js`
- Rückgängig/Wiederholen, Zwischenablage, alle wichtigen Tastenkürzel (F1)
- **Automatische Updates** (Installer-Version) aus den GitHub-Releases, Hinweis bei portable/ZIP

## Entwickeln

```bash
npm install
npm start
```

## Windows-Programm bauen

Auf Windows:

```bash
npm run dist
```

Erzeugt in `dist/` den Installer (`Pixel-Bro-Setup.exe`), eine portable EXE und eine ZIP.
Unter Linux ohne Wine geht nur `npm run dist:zip` (ZIP zum Entpacken).

Alternativ baut der GitHub-Workflow **„Pixel Bro – Windows-Build“** alles automatisch bei jedem Push;
die Dateien liegen dann unter *Actions → Lauf → Artifacts*.

Die App läuft auch direkt im Browser: `src/index.html` öffnen.

---

Entwickelt von **Jens Niebisch** für **[Bro Kartell](https://bro-kartell.com)** – Multigaming Clan seit 2013.

## Automatische Updates

- Quelle: `https://github.com/brokartell/brokartell/releases/latest/download/latest.yml` (lädt der Release-Workflow mit hoch)
- Installierte Version (`Uninstall Pixel Bro.exe` liegt neben der EXE): `electron-updater` lädt das neue Setup und installiert es still
- Portable (`PORTABLE_EXECUTABLE_DIR`) und ZIP: nur Hinweis mit Link auf bro-kartell.com/pixel-bro.html
- Logik in `updater.js`, Oberfläche in `src/app.js` (Abschnitt „Updates“)
- Zum Testen ohne Release: `PIXELBRO_UPDATE_URL=http://… npm start` (eigene `latest.yml`), `PIXELBRO_UPDATE_KIND` setzt die Art

## Neue Version veröffentlichen

1. In `package.json` die `version` erhöhen (z. B. `1.0.3`) und in `src/app.js` die `APP_VERSION` anpassen.
2. In `CHANGELOG.md` einen Abschnitt `## 1.0.3` mit den Neuerungen ergänzen.
3. Die Änderung in `main` übernehmen (z. B. Pull-Request mergen).

Der Workflow **„Pixel Bro – Release veröffentlichen“** merkt die neue Version, baut Installer,
portable EXE und ZIP und erstellt das GitHub-Release. Ist die Version schon veröffentlicht, passiert nichts.
Die Download-Links auf der Homepage (`…/releases/latest/download/Pixel-Bro-Setup.exe`)
zeigen automatisch auf die neueste Version.
