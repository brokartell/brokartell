# Changelog

## 1.5.7 – Kacheln zählen wie GB Studio
- Game Boy Color: „Verschiedene Kacheln“ wird jetzt genau wie in GB Studio gezählt. Gleiches Muster mit einer anderen Palette (z. B. dasselbe Auto in Rot und Blau) ist nur eine Kachel, und gespiegelte Kacheln (waagerecht, senkrecht oder beides) zählen nur einmal – wie mit „Auto Tile Flip“ in GB Studio. Das Prüf-Fenster zeigt zusätzlich die Zahl ohne Spiegeln
- Reste am Rand, die keine ganze 8×8-Kachel sind, zählen nicht mit (GB Studio schneidet sie ab)

## 1.5.6 – Prüfung rechnet wie GB Studio
- Game Boy Color: Die Paletten werden jetzt genau so aufgeteilt wie in GB Studio („Automatisch“) – gleiche Reihenfolge, gleiches Zusammenlegen, gleiche Farbkorrektur. Bisher fand Pixel Bro manchmal eine geschicktere Aufteilung mit 7 Paletten, während GB Studio 8 braucht – dann bekamen Kacheln in GB Studio falsche Farben (z. B. Teich grau statt blau), obwohl Pixel Bro „passt“ meldete
- Bei zu vielen Paletten zeigt das Prüf-Fenster fast gleiche Farben an, deren Zusammenlegen oft eine Palette spart

## 1.5.5
- „Farbe überall ersetzen“ (Doppelklick in „Benutzte Farben“) überarbeitet: HEX-Feld zum Eintippen und Einfügen (Strg+V), alle Farben aus dem Bild zum Anklicken – praktisch, um zwei ähnliche Farben zu einer zusammenzulegen und so eine Palettenfarbe zu sparen. Der Windows-Farbwähler bleibt als Knopf

## 1.5.4
- Game Boy Color: Passt eine Kachel in mehrere Paletten (z. B. nur Weiß und Dunkel), bekommt sie jetzt die Palette ihrer Nachbarn – vor allem der Nachbarn, in die ihre Farben über die Kante weiterlaufen. So zeigt z. B. der Sockel eines Hauses dieselbe Nummer wie das Haus
- Solche Kacheln haben ein „+“ hinter der Nummer (z. B. „6+“): Sie würden auch in andere Paletten passen

## 1.5.3
- Game Boy Color: Braucht ein Bild mehr als 7 Paletten, werden die überzähligen Paletten rot markiert – die mit den wenigsten Kacheln, weil sie sich am leichtesten einsparen lassen. Rot in der Übersicht oben links, im Prüf-Fenster („zu viel“) und auf ihren Kacheln im Bild

## 1.5.2
- GB-Studio-Prüfung im Bild: Unter der Anzeige oben links steht jetzt eine kleine Paletten-Übersicht – Nummer und die 4 Farben jeder Palette, in denselben Farben wie die Nummern im Bild (beim klassischen Game Boy: erlaubte und fremde Farben). Klick auf eine Farbe = Primärfarbe, Rechtsklick = Sekundärfarbe
- Die Zahl neben „Farbe & Palette“ (bei „Benutzte Farben“) ist weg – sie wirkte wie eine Palettenzahl
- Game Boy Color: Bei Kacheln mit mehr als 4 Farben werden jetzt genau die überzähligen Pixel rot markiert (die Farbe, bei der am wenigsten Pixel geändert werden müssen). Prüf-Fenster und Paletten-Übersicht zeigen, welche Farben zu viel sind

## 1.5.1
- Neuer Knopf „Einpassen“ oben rechts neben Rückgängig/Wiederholen: Bild wieder mittig und ganz sichtbar (auch Taste 0)
- Der Knopf „Exportieren“ öffnet ein Fenster mit Umschalter **PNG · Spritesheet · GIF** – Pixel Bro merkt sich das zuletzt benutzte Format. Die Einträge im Menü Datei bleiben
- Spritesheet: „Spalten“ ist automatisch mit der Anzahl der Frames vorbelegt und erscheint nur noch bei der Anordnung „Raster“
- Vorschau-Zoom: Mausrad über der Vorschau zoomt bis 32× zur Mausposition, Ziehen verschiebt den Ausschnitt, Doppelklick oder Klick auf die Zoom-Anzeige zeigt wieder das ganze Bild – so sieht man auch kleine Bewegungen in großen Bildern

## 1.5.0 – Game Boy Color / Game Boy (klassisch)
- Prüf-Dialog (Bild → GB-Studio-Paletten prüfen, Umschalt+G) mit Umschalter **Game Boy Color / Game Boy (klassisch)** – die Auswahl wird gespeichert, die Überschrift zeigt den Modus
- **Game Boy Color:** wie bisher Paletten pro 8×8-Kachel (höchstens 7 für Hintergründe, „X von 7“), dazu die Zahl der verschiedenen Kacheln (Grenze 384)
- **Game Boy (klassisch):** prüft, ob nur die 4 Farben #E0F8CF, #86C06C, #306850 und #071821 vorkommen (mit Schalter „Sprite“ zusätzlich #65FF00 als Transparenz). Fremde Farben werden gezählt und im Bild rot markiert, dazu die Zahl der verschiedenen Kacheln (Grenze 192). Grüner Haken, wenn alles passt, sonst Warnung
- Die Anzeige oben links auf der Zeichenfläche zeigt den gewählten Modus und rechnet beim Zeichnen live mit

## 1.4.1
- Pipette und Verschieben haben jetzt auch eigene lila Mauszeiger mit Rand (Pipette und Kreuzpfeil) – passend zu Stift, Hand und Text

## 1.4.0 – GB-Studio-Paletten prüfen
- **Bild → GB-Studio-Paletten prüfen** (Umschalt+G): zerlegt das Bild in 8×8-Kacheln und fasst die Farben zu möglichst wenigen Paletten mit je 4 Farben zusammen – so wie GB Studio im Farbmodus. Zeigt, wie viele der 7 freien Paletten das Bild braucht, welche 4 Farben jede Palette hat und in wie vielen Kacheln sie vorkommt
- Warnungen bei Kacheln mit mehr als 4 Farben, bei mehr als 7 Paletten und wenn das Bild nicht aus ganzen 8×8-Kacheln besteht
- „Im Bild zeigen“: jede Kachel bekommt die Nummer ihrer Palette, Problem-Kacheln werden rot. Eine kleine Anzeige oben links rechnet beim Zeichnen live mit
- „Paletten speichern“ legt die gefundenen Paletten als eigene Paletten an
- Pixelraster leicht lila – jetzt auch auf hellen Bildern gut zu sehen

## 1.3.3
- Werkzeugleiste: kleiner Abstand zwischen den Werkzeugen, damit Markierung und Hover nicht mehr aneinanderkleben – passt weiterhin ohne Scrollbalken
- Farbfelder: Der Pfeil zum Tauschen der Farben klebt nicht mehr am Farbfeld
- Mauszeiger auf der Zeichenfläche (Kreuz, Hand, Text) jetzt lila mit weißem Rand – auch auf hellen Bildern gut zu sehen

## 1.3.2
- Werkzeugleiste wieder neben der Zeichenfläche (wie vor 1.3.1), dafür kompakter: kleinere Abstände und Trennlinien – alle Werkzeuge passen ohne Scrollbalken (ab ca. 768 Pixel Bildschirmhöhe). Bei noch kleineren Fenstern scrollt die Leiste per Mausrad, ohne sichtbaren Balken

## 1.3.1
- Text: neue Auswahl **Schriftgröße** 1× bis 10× (5 bis 50 Pixel hohe Buchstaben) – passend auch für große Bilder. Der Zeichenabstand wächst mit
- Text: Nach dem Festsetzen (Enter oder Werkzeugwechsel) bleibt keine gestrichelte Umrandung mehr stehen – Stift und Pinsel malen sofort wieder überall
- Text: Rückgängig entfernt den Text komplett, ohne übrig gebliebene Umrandung
- Werkzeugleiste geht jetzt bis ganz nach unten, die Zeitleiste rückt nach rechts – die Werkzeuge haben mehr Platz und müssen nicht mehr scrollen

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
