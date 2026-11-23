# Pixel Bro

Moderner Pixel-Art- und Animations-Editor für Windows – komplett auf Deutsch.
Inspiriert von Tools wie Piskel und Pyxel Edit, aber mit frischer, dunkler (oder heller) Oberfläche.

## Funktionen

- **Werkzeuge:** Stift (mit Pixel-Perfect), Radierer, Füllen, Pipette, Linie, Rechteck, Ellipse,
  Auswahl, Zauberstab, Verschieben, Dithering, Aufhellen/Abdunkeln, Hand
- **Zeichnen:** Pinselgröße 1–16 px, Spiegel-Zeichnen horizontal/vertikal, Rechtsklick = Sekundärfarbe
- **Ebenen:** hinzufügen, duplizieren, sortieren, zusammenführen, ein-/ausblenden, Deckkraft, umbenennen
- **Animation:** Frames hinzufügen/duplizieren/löschen, per Drag & Drop sortieren, Live-Vorschau mit FPS, Zwiebelhaut
- **Tiles:** Kachel-Modus (nahtloses Zeichnen mit 3×3-Vorschau) und einstellbares Kachelraster
- **Farben:** Live-Palette „Benutzte Farben“ (erkennt alle Farben im Sprite, Doppelklick ersetzt eine Farbe überall), Paletten (Bro 32, PICO-8, Endesga 32, Sweetie 16, Game Boy, Graustufen), eigene Palette,
  Palette aus Bild, Deckkraft, zuletzt benutzte Farben
- **Bild:** Größe ändern / skalieren, spiegeln, drehen, Farbe ersetzen, Umriss hinzufügen
- **Import:** PNG/JPG/GIF als neues Sprite, als Ebene oder Spritesheet in Frames zerlegen
- **Export:** PNG (skaliert), Spritesheet (horizontal/vertikal/Raster), animiertes GIF
- **Projekte:** `.pixelbro`-Dateien, Doppelklick im Explorer öffnet sie, automatische Sicherung
- Rückgängig/Wiederholen, Zwischenablage, alle wichtigen Tastenkürzel (F1)

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

Erzeugt in `dist/` den Installer (`Pixel-Bro-Setup-1.0.2.exe`) und eine portable EXE.
Unter Linux ohne Wine geht nur `npm run dist:zip` (ZIP zum Entpacken).

Alternativ baut der GitHub-Workflow **„Pixel Bro – Windows-Build“** alles automatisch bei jedem Push;
die Dateien liegen dann unter *Actions → Lauf → Artifacts*.

Die App läuft auch direkt im Browser: `src/index.html` öffnen.

---

Entwickelt von **Jens Niebisch** für **[Bro Kartell](https://bro-kartell.com)** – Multigaming Clan seit 2013.
