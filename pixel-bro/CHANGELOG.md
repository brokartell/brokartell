# Changelog

## 1.3.0 – Neue Werkzeuge & Englisch
- **Verlauf** (J): Linie ziehen – Übergang von Primär- zu Sekundärfarbe, wahlweise mit Dithering-Muster oder in harten Stufen (2–16). Füllt die Auswahl oder wie das Füllen-Werkzeug die Fläche unter dem Startpunkt. Umschalt rastet in 45°-Schritten ein
- **Sprühdose** (S): sprüht zufällige Pixel im Pinselbereich, Dichte einstellbar – für Gras, Rauch oder Schmutz
- **Text** (K): eingebaute 5 px hohe Pixel-Schrift mit Umlauten, Ziffern und Satzzeichen, mehrzeilig. Der Text lässt sich vor dem Festsetzen mit der Maus verschieben
- **Mittellinien**: Schalter „Mitte“ neben „Raster“ (oder Umschalt+M) zeigt eine waagerechte und eine senkrechte Linie durch die Bildmitte
- **Englisch** als zweite Sprache: Ansicht → English. Alle Menüs, Dialoge, Tooltips und Meldungen werden sofort umgestellt, Deutsch bleibt Standard

## 1.2.6
- Rechte Seitenleiste: Bei vielen Ebenen scrollt nur noch die Ebenen-Liste, nicht mehr die ganze Leiste. Die Ebenen nutzen den Platz bis ganz unten
- Deckkraft: Der Regler ist etwas kürzer, damit „100 %“ immer ins Feld passt

## 1.2.5
- Frames in der Zeitleiste: Das Vorschaubild verzerrt beim Drüberfahren nicht mehr, große Bilder werden sauber verkleinert
- Vorschau zeigt jetzt auch große Bilder (z. B. 160 × 144) komplett
- Paletten-Auswahl: ohne eigene Paletten steht dort nur noch „Noch keine“

## 1.2.4
- Fehler behoben: Gelöschte eigene Paletten kamen nach einem Neustart wieder zurück (die einmalige Übernahme der alten „Eigene Palette“ lief bei jeder leeren Palettenliste erneut)

## 1.2.3
- Rechte Seitenleiste etwas breiter: Paletten-Auswahl zeigt auch „GB Studio – Hintergründe“ vollständig
- Update-Hinweis sitzt jetzt unten rechts über der Zeitleiste und verdeckt weder Zeichenfläche noch Ebenen

## 1.2.2
- Palette „GB Studio“ aufgeteilt in **„GB Studio – Sprites“** (#071821, #86C06C, #E0F8CF und **#65FF00 für Transparenz**) und **„GB Studio – Hintergründe“** (#071821, #306850, #86C06C, #E0F8CF) – genau so, wie GB Studio die Farben verlangt
- Wer bisher „GB Studio“ gewählt hatte, bekommt automatisch „GB Studio – Sprites“

## 1.2.1
- Neues App-Icon – gezeichnet von izec313 mit Pixel Bro selbst (Programm, Taskleiste, Startmenü, Installer)

## 1.2.0
- **Mehrere eigene Paletten:** bis zu 20 eigene Paletten, jede mit eigenem Namen
- Neue Knöpfe neben dem Paletten-Auswahlfeld: Neue Palette, Umbenennen, Löschen
- „Farben aus dem Bild übernehmen“ legt eine neue benannte Palette an (oder ersetzt die gewählte eigene Palette)
- Auswahlfeld mit den Gruppen „Vorlagen“ und „Eigene Paletten“
- Änderungen an einer Vorlage legen automatisch eine eigene Kopie an – die Vorlage bleibt unverändert
- Die bisherige „Eigene Palette“ wird automatisch als „Eigene Palette 1“ übernommen

## 1.1.5
- Update ohne Fehlermeldung: Hält z. B. ein Virenscanner beim Update eine Programmdatei fest, erscheint nicht mehr „Die alten Anwendungsdateien konnten nicht deinstalliert werden …: 2“ – der Installer überschreibt die Dateien einfach

## 1.1.4
- Neue Palette **„GB Studio“** mit den vier Standardfarben von GB Studio (#071821, #306850, #86C06C, #E0F8CF) – passt zu Sprites für GB-Studio-Spiele
- Die bisherige Palette „Game Boy“ (klassisches Erbsengrün) bleibt erhalten

## 1.1.3
- Automatisches Update: Der Installer startet erst ein paar Sekunden, nachdem sich Pixel Bro komplett beendet hat. Das verhindert die Meldung „Die alten Anwendungsdateien konnten nicht deinstalliert werden …: 2“
- Gilt für „Jetzt neu starten“ und für „Später“ (Installation beim Schließen)

## 1.1.2
- Versionsnummer immer sichtbar: kleines lila Schild neben „Pixel Bro“ oben links
- Menüs breiter: Einträge wie „Animiertes GIF exportieren …“ brechen nicht mehr um

## 1.1.1
- Schließen-Dialog verständlicher: „Dein Projekt ist noch nicht als Datei gespeichert“ mit den Knöpfen „Speichern …“, „Schließen“ und „Abbrechen“
- „Speichern …“ legt direkt die .pixelbro-Datei an und schließt danach
- Beim Schließen wird die Arbeit sofort gesichert, auch der letzte Strich

## 1.1.0
- **Automatische Updates:** Die installierte Version sucht beim Start nach einer neuen Version, lädt sie im Hintergrund und installiert sie nach einem Klick auf „Jetzt neu starten“ (oder beim Schließen)
- Portable EXE und ZIP zeigen einen Hinweis mit Download-Link, wenn es eine neue Version gibt
- Hilfe → „Nach Updates suchen“ und „Automatisch nach Updates suchen“ (abschaltbar)
- Hinweis: Diese Version einmal von Hand installieren – ab dann aktualisiert sich Pixel Bro selbst

## 1.0.3
- Scrollleisten an der Zeichenfläche (waagerecht und senkrecht): Beim Reinzoomen kann man das Bild verschieben, ohne rauszuzoomen
- Umschalt + Mausrad scrollt waagerecht
- Schalter in der oberen Leiste (Raster, Zwiebelhaut usw.) sind eingeschaltet jetzt komplett lila

## 1.0.2
- Neue Live-Palette **„Benutzte Farben“**: erkennt automatisch alle Farben im Sprite (alle Ebenen und Frames) und aktualisiert sich beim Zeichnen
- Tooltip zeigt, wie viele Pixel eine Farbe belegen
- Doppelklick auf eine Farbe ersetzt sie überall im Sprite
- Kleiner Darstellungsfehler in der Seitenleiste behoben

## 1.0.1
- „Über Pixel Bro“ mit Entwickler, Link zur Homepage und zum Impressum
- Hersteller und Copyright in den Dateieigenschaften der EXE

## 1.0.0
- Erste Version: Ebenen, Frames, Zwiebelhaut, Kachel-Modus, Pixel-Perfect-Stift, Spiegel-Zeichnen,
  Dithering, Zauberstab, Paletten sowie PNG-, Spritesheet- und GIF-Export
