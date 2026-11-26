'use strict';
/* ==========================================================================
   Pixel Bro – Sprachen (Deutsch = Standard, Englisch)
   - Texte im Programm bleiben auf Deutsch geschrieben. Ist Englisch gewählt,
     übersetzt i18n.js jeden sichtbaren Text über das Wörterbuch EN unten.
   - Texte mit Platzhaltern: t('Frame {n}/{m}', { n, m })
   - Elemente mit data-i18n-skip (z. B. Ebenennamen) werden nicht übersetzt.
   Neue Texte: deutschen Text als Schlüssel in EN eintragen.
   ========================================================================== */

const LANGS = { de: 'Deutsch', en: 'English' };

const EN = {
  // ---------- Menüs ----------
  'Datei': 'File',
  'Neues Sprite …': 'New sprite …',
  'Projekt öffnen …': 'Open project …',
  'Projekt speichern': 'Save project',
  'Bild importieren …': 'Import image …',
  'Als PNG exportieren …': 'Export as PNG …',
  'Spritesheet exportieren …': 'Export spritesheet …',
  'Animiertes GIF exportieren …': 'Export animated GIF …',
  'Bearbeiten': 'Edit',
  'Rückgängig': 'Undo',
  'Wiederholen': 'Redo',
  'Ausschneiden': 'Cut',
  'Kopieren': 'Copy',
  'Einfügen': 'Paste',
  'Auswahl löschen': 'Delete selection',
  'Alles auswählen': 'Select all',
  'Auswahl aufheben': 'Deselect',
  'Bild': 'Image',
  'Größe ändern …': 'Resize …',
  'Horizontal spiegeln': 'Flip horizontally',
  'Vertikal spiegeln': 'Flip vertically',
  '90° drehen': 'Rotate 90°',
  'Farbe ersetzen (alle Frames)': 'Replace color (all frames)',
  'Umriss hinzufügen': 'Add outline',
  'Ebene leeren': 'Clear layer',
  'Ansicht': 'View',
  'Pixelraster': 'Pixel grid',
  'Mittellinien': 'Center lines',
  'Kachelraster …': 'Tile grid …',
  'Kachel-Modus (nahtlos)': 'Tile mode (seamless)',
  'Zwiebelhaut': 'Onion skin',
  'Vergrößern': 'Zoom in',
  'Verkleinern': 'Zoom out',
  'Einpassen': 'Fit to screen',
  'Helles / dunkles Design': 'Light / dark theme',
  'Sprache': 'Language',
  'Hilfe': 'Help',
  'Tastenkürzel': 'Keyboard shortcuts',
  'Nach Updates suchen …': 'Check for updates …',
  'Automatisch nach Updates suchen': 'Check for updates automatically',
  'Über Pixel Bro': 'About Pixel Bro',
  'Exportieren': 'Export',
  'Exportieren – PNG, Spritesheet oder GIF': 'Export – PNG, spritesheet or GIF',
  'Rückgängig (Strg+Z)': 'Undo (Ctrl+Z)',
  'Wiederholen (Strg+Y)': 'Redo (Ctrl+Y)',

  // ---------- Werkzeugoptionen ----------
  'Pinselgröße': 'Brush size',
  'Gefüllt': 'Filled',
  'Pixel-Perfect': 'Pixel-perfect',
  'Entfernt doppelte Eckpixel bei 1-px-Linien': 'Removes double corner pixels on 1 px lines',
  'Zusammenhängend': 'Contiguous',
  'Aus: ersetzt die Farbe überall auf der Ebene': 'Off: replaces the color everywhere on the layer',
  'Stärke': 'Strength',
  'Spiegel ↔': 'Mirror ↔',
  'Spiegel ↕': 'Mirror ↕',
  'Horizontal gespiegelt zeichnen': 'Draw mirrored horizontally',
  'Vertikal gespiegelt zeichnen': 'Draw mirrored vertically',
  'Raster': 'Grid',
  'Mitte': 'Center',
  'Mittellinien: waagerecht und senkrecht durch die Bildmitte': 'Center lines: horizontal and vertical through the middle of the image',
  'Kachel-Modus': 'Tile mode',
  'Stufen': 'Steps',
  'Anzahl der Farbstufen im Verlauf': 'Number of color steps in the gradient',
  'Dithering': 'Dithering',
  'Weicher Übergang mit Pixel-Muster': 'Smooth transition with a pixel pattern',
  'Dichte': 'Density',
  'Wie viele Pixel pro Sprühstoß': 'How many pixels per spray burst',

  // ---------- Werkzeuge ----------
  'Stift (B)': 'Pen (B)',
  'Radierer (E)': 'Eraser (E)',
  'Füllen (G)': 'Fill (G)',
  'Pipette (I) – oder Alt gedrückt halten': 'Eyedropper (I) – or hold Alt',
  'Linie (L)': 'Line (L)',
  'Rechteck (R)': 'Rectangle (R)',
  'Ellipse (O)': 'Ellipse (O)',
  'Auswahl (M)': 'Selection (M)',
  'Zauberstab (W)': 'Magic wand (W)',
  'Verschieben (V)': 'Move (V)',
  'Dithering (D)': 'Dithering (D)',
  'Aufhellen / Abdunkeln (U) – Umschalt dunkelt ab': 'Lighten / darken (U) – Shift darkens',
  'Hand (H) – oder Leertaste halten': 'Hand (H) – or hold Space',
  'Verlauf (J) – ziehen: Primär- → Sekundärfarbe': 'Gradient (J) – drag: primary → secondary color',
  'Sprühdose (S)': 'Spray can (S)',
  'Text (K)': 'Text (K)',
  'Links: Primärfarbe · Rechts-Klick malt mit Sekundärfarbe · X tauscht': 'Left: primary color · Right-click paints with secondary color · X swaps',
  'Farben tauschen (X)': 'Swap colors (X)',
  'Stift': 'Pen',
  'Radierer': 'Eraser',
  'Füllen': 'Fill',
  'Pipette': 'Eyedropper',
  'Linie': 'Line',
  'Rechteck': 'Rectangle',
  'Ellipse': 'Ellipse',
  'Auswahl': 'Selection',
  'Zauberstab': 'Magic wand',
  'Verschieben': 'Move',
  'Aufhellen/Abdunkeln': 'Lighten/darken',
  'Hand': 'Hand',
  'Verlauf': 'Gradient',
  'Sprühdose': 'Spray can',
  'Text': 'Text',

  // ---------- Seitenleiste ----------
  'Vorschau': 'Preview',
  'Abspielen / Pause': 'Play / pause',
  'Zoom zurücksetzen – ganzes Bild zeigen (Doppelklick)': 'Reset zoom – show the whole image (double-click)',
  'FPS': 'FPS',
  'Farbe & Palette': 'Color & palette',
  'HEX': 'HEX',
  'Deckkraft': 'Opacity',
  'Primärfarbe zur Palette hinzufügen (bei Vorlagen: als eigene Kopie)': 'Add primary color to the palette (presets: as your own copy)',
  'Farben aus dem Bild als eigene Palette übernehmen': 'Use the image colors as your own palette',
  'Zuletzt benutzt': 'Recently used',
  'Palette wählen': 'Choose palette',
  'Neue eigene Palette': 'New custom palette',
  'Eigene Palette umbenennen': 'Rename custom palette',
  'Eigene Palette löschen': 'Delete custom palette',
  'Klick: Primär · Rechtsklick: Sekundär · Strg+Klick: entfernen': 'Click: primary · Right-click: secondary · Ctrl+click: remove',
  'Klick: Primär · Rechtsklick: Sekundär · Ändern legt eine eigene Kopie an': 'Click: primary · Right-click: secondary · Changing it creates your own copy',
  'Erkennt automatisch alle Farben im Sprite · Klick: Primär · Rechtsklick: Sekundär · Doppelklick: Farbe überall ersetzen': 'Detects all colors in the sprite automatically · Click: primary · Right-click: secondary · Double-click: replace color everywhere',
  'Noch keine Farben benutzt – fang einfach an zu zeichnen.': 'No colors used yet – just start drawing.',
  'Leer – füge mit + die Primärfarbe hinzu oder übernimm Farben aus dem Bild.': 'Empty – add the primary color with + or take colors from the image.',
  '★ Benutzte Farben (live)': '★ Used colors (live)',
  'Benutzte Farben': 'Used colors',
  'Vorlagen': 'Presets',
  'Eigene Paletten ({n}/{max})': 'Custom palettes ({n}/{max})',
  'Noch keine': 'None yet',
  'Graustufen': 'Grayscale',
  'GB Studio – Hintergründe': 'GB Studio – Backgrounds',
  'Ebenen': 'Layers',
  'Neue Ebene': 'New layer',
  'Ebene duplizieren': 'Duplicate layer',
  'Nach oben': 'Move up',
  'Nach unten': 'Move down',
  'Mit darunterliegender zusammenführen': 'Merge with the layer below',
  'Ebene löschen': 'Delete layer',
  'Doppelklick zum Umbenennen': 'Double-click to rename',
  'Ausblenden': 'Hide',
  'Einblenden': 'Show',

  // ---------- Zeitleiste ----------
  'Vorheriger Frame (,)': 'Previous frame (,)',
  'Nächster Frame (.)': 'Next frame (.)',
  'Neuer Frame (N)': 'New frame (N)',
  'Frame duplizieren (Umschalt+N)': 'Duplicate frame (Shift+N)',
  'Frame löschen': 'Delete frame',
  'Neuer Frame': 'New frame',
  'Frame duplizieren': 'Duplicate frame',
  'Neuer Frame danach': 'New frame after this one',

  // ---------- Meldungen ----------
  'Nichts zum Rückgängigmachen': 'Nothing to undo',
  'Nichts zum Wiederholen': 'Nothing to redo',
  'Kopiert': 'Copied',
  'Zwischenablage ist leer': 'Clipboard is empty',
  'Sprite um 90° gedreht': 'Sprite rotated by 90°',
  'Sprite gespiegelt': 'Sprite flipped',
  'Umriss in Primärfarbe hinzugefügt': 'Outline added in primary color',
  '{n} Pixel ersetzt (Primär → Sekundär)': '{n} pixels replaced (primary → secondary)',
  '{n} Pixel umgefärbt': '{n} pixels recolored',
  'Die letzte Ebene kann nicht gelöscht werden': 'The last layer cannot be deleted',
  'Keine Ebene darunter': 'No layer below',
  'Der letzte Frame kann nicht gelöscht werden': 'The last frame cannot be deleted',
  'Maximal {max} eigene Paletten – lösch eine, um Platz zu machen': 'At most {max} custom palettes – delete one to make room',
  'Eigene Kopie „{name}“ angelegt – die Vorlage bleibt unverändert': 'Created your own copy “{name}” – the preset stays unchanged',
  '„{name}“ angelegt – füge mit + die Primärfarbe hinzu oder übernimm Farben aus dem Bild': '“{name}” created – add the primary color with + or take colors from the image',
  'Nur eigene Paletten lassen sich umbenennen': 'Only custom palettes can be renamed',
  'Nur eigene Paletten lassen sich löschen': 'Only custom palettes can be deleted',
  '„{name}“ gelöscht': '“{name}” deleted',
  'Das Bild enthält noch keine Farben': 'The image has no colors yet',
  'Zu viele Farben ({n}) – maximal 256': 'Too many colors ({n}) – 256 at most',
  '„{name}“ mit {n} Farben ersetzt': '“{name}” replaced with {n} colors',
  'Neue Palette „{name}“ mit {n} Farben': 'New palette “{name}” with {n} colors',
  'Kachel-Modus an – Zeichnen wiederholt sich nahtlos': 'Tile mode on – drawing repeats seamlessly',
  'Kachel-Modus aus': 'Tile mode off',
  'Pixel Bro sucht beim Start automatisch nach Updates': 'Pixel Bro checks for updates automatically at startup',
  'Automatische Update-Suche ist aus': 'Automatic update check is off',
  'Ungültiger HEX-Wert': 'Invalid HEX value',
  'Farbe ist bereits in der Palette': 'Color is already in the palette',
  'Zu viele Farben – GIF-Palette wurde reduziert': 'Too many colors – GIF palette was reduced',
  'Gespeichert: {name}': 'Saved: {name}',
  'Download gestartet: {name}': 'Download started: {name}',
  'Geöffnet: {name}': 'Opened: {name}',
  'Keine Pixel-Bro-Datei': 'Not a Pixel Bro file',
  'Bild konnte nicht gelesen werden': 'Image could not be read',
  'Maximal 1024 × 1024 px': '1024 × 1024 px at most',
  'Frame-Größe passt nicht ins Bild': 'Frame size does not fit the image',
  '{n} Frames importiert': '{n} frames imported',
  'Letzte Sitzung wiederhergestellt': 'Last session restored',
  'Mittellinien an': 'Center lines on',
  'Mittellinien aus': 'Center lines off',
  'Text eingefügt – mit der Maus verschieben, Enter setzt ihn fest': 'Text inserted – drag it with the mouse, Enter places it',
  'Klick ins Bild, um Text einzufügen': 'Click into the image to insert text',

  // ---------- Dialoge ----------
  'Abbrechen': 'Cancel',
  'OK': 'OK',
  'Ersetzen': 'Replace',
  'Alte Farbe': 'Old color',
  'Neue Farbe': 'New color',
  'Farben im Bild – zum Übernehmen anklicken': 'Colors in the image – click to use',
  'Farbwähler': 'Color picker',
  'Betrifft': 'Affects',
  'Pixel in allen Ebenen und Frames. Die Deckkraft bleibt erhalten.': 'pixels in all layers and frames. Opacity is kept.',
  'Farbe überall ersetzen': 'Replace color everywhere',
  'Name der Palette': 'Palette name',
  'Neue Palette': 'New palette',
  'Anlegen': 'Create',
  'Palette umbenennen': 'Rename palette',
  'Umbenennen': 'Rename',
  'Die Palette {name} mit {n} Farben wird gelöscht. Deine Bilder bleiben unverändert.': 'The palette {name} with {n} colors will be deleted. Your images stay unchanged.',
  'Palette löschen?': 'Delete palette?',
  'Löschen': 'Delete',
  '„{name}“ ersetzen': 'Replace “{name}”',
  'Als neue Palette': 'As new palette',
  '{n} Farben aus dem Bild übernehmen': 'Take {n} colors from the image',
  'Breite (px)': 'Width (px)',
  'Höhe (px)': 'Height (px)',
  '160 × 144 (Handheld)': '160 × 144 (handheld)',
  'Ungespeicherte Änderungen am aktuellen Sprite gehen verloren (Rückgängig bleibt möglich).': 'Unsaved changes to the current sprite will be lost (undo stays possible).',
  'Neues Sprite': 'New sprite',
  'Erstellen': 'Create',
  'Oben links': 'Top left',
  'Oben': 'Top',
  'Oben rechts': 'Top right',
  'Links': 'Left',
  'Rechts': 'Right',
  'Unten links': 'Bottom left',
  'Unten': 'Bottom',
  'Unten rechts': 'Bottom right',
  'Modus': 'Mode',
  'Arbeitsfläche ändern (Pixel bleiben)': 'Change canvas (pixels stay)',
  'Skalieren (Nearest Neighbor)': 'Scale (nearest neighbor)',
  'Ausrichtung': 'Anchor',
  'Größe ändern': 'Resize',
  'Anwenden': 'Apply',
  'Kachelgröße (0 = aus)': 'Tile size (0 = off)',
  'Hilft beim Zeichnen von Tilesets: zeigt ein Raster in der gewählten Kachelgröße.': 'Helps when drawing tilesets: shows a grid in the chosen tile size.',
  'Kachelraster': 'Tile grid',
  'Einpassen – Bild mittig und ganz sichtbar (0)': 'Fit to screen – image centered and fully visible (0)',
  'Übernehmen': 'Apply',
  'Skalierung': 'Scale',
  'Inhalt': 'Content',
  'Aktueller Frame ({n})': 'Current frame ({n})',
  'Nur aktuelle Ebene': 'Current layer only',
  'Als PNG exportieren': 'Export as PNG',
  'Anordnung': 'Layout',
  'Horizontal (1 Zeile)': 'Horizontal (1 row)',
  'Vertikal (1 Spalte)': 'Vertical (1 column)',
  'Spalten (bei Raster)': 'Columns (for grid)',
  '{n} Frame(s) · {w} × {h} px pro Frame': '{n} frame(s) · {w} × {h} px per frame',
  'Spritesheet exportieren': 'Export spritesheet',
  'Endlos': 'Forever',
  'Einmal': 'Once',
  'Halbtransparente Pixel werden voll deckend gespeichert, vollständig transparente bleiben transparent.': 'Semi-transparent pixels are saved fully opaque, fully transparent ones stay transparent.',
  'Animiertes GIF exportieren': 'Export animated GIF',
  'GIF-Animation': 'GIF animation',
  'PNG-Bild': 'PNG image',
  'Pixel-Bro-Projekt': 'Pixel Bro project',
  'Bilder': 'Images',
  'Datei konnte nicht geöffnet werden': 'File could not be opened',
  'Importieren als': 'Import as',
  'Neue Ebene im aktuellen Frame': 'New layer in the current frame',
  'Spritesheet → Frames aufteilen': 'Spritesheet → split into frames',
  'Frame-Breite': 'Frame width',
  'Frame-Höhe': 'Frame height',
  'Frame-Größe gilt nur für „Spritesheet“.': 'Frame size only applies to “Spritesheet”.',
  'Bild importieren': 'Import image',
  'Importieren': 'Import',
  'Text einfügen': 'Insert text',
  'Großbuchstaben, Ziffern, Umlaute und einfache Satzzeichen · Enter = neue Zeile · Farbe: Primärfarbe': 'Capital letters, digits, umlauts and simple punctuation · Enter = new line · Color: primary color',
  'Zeichenabstand': 'Letter spacing',
  'Schriftgröße': 'Font size',
  'Schriftgröße = Höhe der Buchstaben im Bild · Zeichenabstand wächst mit der Schriftgröße · Kleinbuchstaben werden als Großbuchstaben gezeichnet.': 'Font size = height of the letters in the image · Letter spacing grows with the font size · Lowercase letters are drawn as capitals.',

  // ---------- Über / Tastenkürzel ----------
  'Moderner Pixel-Art- und Animations-Editor auf Deutsch und Englisch': 'Modern pixel art and animation editor in German and English',
  'Entwickelt von': 'Developed by',
  'für': 'for',
  '– Multigaming Clan seit 2013': '– multigaming clan since 2013',
  'Impressum': 'Legal notice',
  'Jens Niebisch · Bro Kartell. Alle Rechte vorbehalten.': 'Jens Niebisch · Bro Kartell. All rights reserved.',
  'Projekte werden als': 'Projects are saved as a',
  '-Datei gespeichert, die aktuelle Arbeit wird zusätzlich automatisch gesichert.': ' file, and your current work is also backed up automatically.',
  'Updates: Pixel Bro fragt beim Start bei GitHub nach einer neuen Version (abschaltbar unter Hilfe → Automatisch nach Updates suchen).': 'Updates: Pixel Bro asks GitHub for a new version at startup (can be turned off under Help → Check for updates automatically).',
  'Updates: Pixel Bro fragt nur auf Wunsch bei GitHub nach einer neuen Version (abschaltbar unter Hilfe → Automatisch nach Updates suchen).': 'Updates: Pixel Bro only asks GitHub for a new version on request (see Help → Check for updates automatically).',
  'Stift / Radierer / Füllen / Pipette': 'Pen / eraser / fill / eyedropper',
  'Linie / Rechteck / Ellipse': 'Line / rectangle / ellipse',
  'Auswahl / Zauberstab / Verschieben': 'Selection / magic wand / move',
  'Dithering / Aufhellen-Abdunkeln / Hand': 'Dithering / lighten-darken / hand',
  'Verlauf / Text / Sprühdose': 'Gradient / text / spray can',
  'Rechtsklick': 'Right-click',
  'Mit Sekundärfarbe zeichnen': 'Draw with the secondary color',
  'Alt (halten)': 'Alt (hold)',
  'Leertaste (halten)': 'Space (hold)',
  'Ansicht verschieben': 'Pan the view',
  'Umschalt': 'Shift',
  'Linien einrasten · Quadrat/Kreis · Auswahl erweitern': 'Snap lines · square/circle · extend selection',
  'Strg (Auswahl)': 'Ctrl (selection)',
  'Von Auswahl abziehen': 'Subtract from selection',
  'Primär- und Sekundärfarbe tauschen': 'Swap primary and secondary color',
  'Pinsel kleiner / größer': 'Brush smaller / bigger',
  'Mausrad': 'Mouse wheel',
  'Zoomen': 'Zoom',
  'Umschalt + Mausrad': 'Shift + mouse wheel',
  'Waagerecht scrollen (oder die Scrollleisten nutzen)': 'Scroll horizontally (or use the scrollbars)',
  'Zoom rein / raus / einpassen': 'Zoom in / out / fit',
  'Vorheriger / nächster Frame': 'Previous / next frame',
  'N / Umschalt+N': 'N / Shift+N',
  'Neuer Frame / Frame duplizieren': 'New frame / duplicate frame',
  'Pfeiltasten': 'Arrow keys',
  'Auswahl um 1 px verschieben': 'Move selection by 1 px',
  'Enter / Esc': 'Enter / Esc',
  'Verschieben bestätigen / Auswahl aufheben': 'Confirm move / deselect',
  'Strg+Z / Strg+Y': 'Ctrl+Z / Ctrl+Y',
  'Rückgängig / Wiederholen': 'Undo / redo',
  'Strg+C / X / V': 'Ctrl+C / X / V',
  'Kopieren / Ausschneiden / Einfügen': 'Copy / cut / paste',
  'Strg+S / Strg+Umschalt+S': 'Ctrl+S / Ctrl+Shift+S',
  'Speichern / Speichern unter': 'Save / save as',
  'Umschalt+M': 'Shift+M',

  // ---------- GB-Studio-Paletten ----------
  'GB-Studio-Paletten prüfen …': 'Check GB Studio palettes …',
  'GB-Studio-Paletten prüfen': 'Check GB Studio palettes',
  'GB-Paletten {n}/{max}': 'GB palettes {n}/{max}',
  '{n} Kacheln mit mehr als 4 Farben': '{n} tiles with more than 4 colors',
  '{n} Kacheln': '{n} tiles',
  '1 Kachel': '1 tile',
  '1 Kachel mit mehr als 4 Farben': '1 tile with more than 4 colors',
  '1 Kachel hat mehr als 4 Farben – auf der Zeichenfläche rot markiert. Diese Kachel musst du vereinfachen.': '1 tile has more than 4 colors – marked red on the canvas. You need to simplify this tile.',
  '1 Palette zu viel – Farben angleichen oder Kacheln mit ähnlichen Farben zusammenfassen.': '1 palette too many – match colors or combine tiles with similar colors.',
  'Paletten speichern': 'Save palettes',
  'Im Bild zeigen': 'Show in image',
  'Im Bild ausblenden': 'Hide from image',
  'Dein Bild braucht {n} von {max} Paletten.': 'Your image needs {n} of {max} palettes.',
  '{n} Kacheln haben mehr als 4 Farben – auf der Zeichenfläche rot markiert. Diese Kacheln musst du vereinfachen.': '{n} tiles have more than 4 colors – marked red on the canvas. You need to simplify these tiles.',
  '{n} Paletten zu viel – Farben angleichen oder Kacheln mit ähnlichen Farben zusammenfassen.': '{n} palettes too many – match colors or combine tiles with similar colors.',
  'Breite und Höhe sind kein Vielfaches von 8 – GB Studio erwartet ganze 8×8-Kacheln.': 'Width and height are not multiples of 8 – GB Studio expects whole 8×8 tiles.',
  'GB Studio (Farbmodus): Jede 8×8-Kachel nutzt eine Palette mit 4 Farben. 7 Paletten sind für Hintergründe frei, die 8. ist für Text und UI reserviert. Geprüft wird der aktuelle Frame.': 'GB Studio (color mode): each 8×8 tile uses one palette with 4 colors. 7 palettes are free for backgrounds, the 8th is reserved for text and UI. The current frame is checked.',
  'Schließen': 'Close',
  'Als eigene Paletten speichern': 'Save as custom palettes',
  'Ansicht ausblenden': 'Hide overlay',
  'Auf der Zeichenfläche zeigen': 'Show on canvas',
  'Details anzeigen': 'Show details',
  'Klick: Primärfarbe · Rechtsklick: Sekundärfarbe': 'Click: primary color · Right-click: secondary color',
  '{n} Paletten gespeichert': '{n} palettes saved',
  'Limit von {max} eigenen Paletten erreicht': 'limit of {max} custom palettes reached',
  'Umschalt+G': 'Shift+G',
  'Game Boy Color – Paletten prüfen': 'Game Boy Color – check palettes',
  'Game Boy (klassisch) – Farben prüfen': 'Game Boy (classic) – check colors',
  'Game Boy (klassisch)': 'Game Boy (classic)',
  'Kacheln {n}/{max}': 'tiles {n}/{max}',
  'GBC-Paletten {n}/{max}': 'GBC palettes {n}/{max}',
  'nur die 4 Farben': 'only the 4 colors',
  '1 Pixel mit fremder Farbe': '1 pixel with a foreign color',
  '{n} Pixel mit fremden Farben': '{n} pixels with foreign colors',
  'Verschiedene Kacheln: {n} von {max}': 'Different tiles: {n} of {max}',
  'Passt für den Game Boy.': 'Fits the Game Boy.',
  'Passt noch nicht für den Game Boy.': 'Does not fit the Game Boy yet.',
  'Nur erlaubte Farben': 'Only allowed colors',
  '1 fremde Farbe in {px} Pixeln': '1 foreign color in {px} pixels',
  '{n} fremde Farben in {px} Pixeln': '{n} foreign colors in {px} pixels',
  'Erlaubt': 'Allowed',
  'Fremd': 'Foreign',
  'Zu viel': 'Extra',
  '1 Palette zu viel – GB Studio legt sie auf eine andere Palette, ihre Kacheln bekommen dann falsche Farben. Farben angleichen oder Kacheln mit ähnlichen Farben zusammenfassen.': '1 palette too many – GB Studio maps it onto another palette and its tiles get the wrong colors. Match colors or combine tiles with similar colors.',
  '{n} Paletten zu viel – GB Studio legt sie auf andere Paletten, ihre Kacheln bekommen dann falsche Farben. Farben angleichen oder Kacheln mit ähnlichen Farben zusammenfassen.': '{n} palettes too many – GB Studio maps them onto other palettes and their tiles get the wrong colors. Match colors or combine tiles with similar colors.',
  'Fast gleiche Farben – zusammenlegen (Doppelklick in „Benutzte Farben“) spart oft eine Palette:': 'Almost identical colors – merging them (double-click in “Used colors”) often saves a palette:',
  'Die Paletten werden genau so aufgeteilt wie in GB Studio („Automatisch“).': 'Palettes are split exactly like GB Studio does (“Automatic”).',
  '(ohne Spiegeln: {n})': '(without flipping: {n})',
  'in GB Studio:': 'in GB Studio:',
  '1 Palette zu viel – GB Studio braucht Platz 8 für Text und gibt dafür still Palette {p} die Farben deiner Palette 8 (siehe unten). Farben angleichen oder ähnliche Kacheln zusammenfassen.': '1 palette too many – GB Studio needs slot 8 for text and silently gives palette {p} the colors of your palette 8 (see below). Match colors or combine similar tiles.',
  'nutzt in GB Studio Palette 8:': 'uses palette 8 in GB Studio:',
  'Palette 8 (Text/UI) deiner Szene:': 'Palette 8 (text/UI) of your scene:',
  'Vorgabe': 'Default',
  'Klick: nur Palette {n} im Bild zeigen': 'Click: show only palette {n} in the image',
  'Alle Paletten zeigen': 'Show all palettes',
  '1 Farbe macht Probleme': '1 color causes problems',
  '{n} Farben machen Probleme': '{n} colors cause problems',
  '1 Farbe weicht leicht ab – GB Studio macht daraus die richtige': '1 color is slightly off – GB Studio turns it into the right one',
  '{n} Farben weichen leicht ab – GB Studio macht daraus die richtigen': '{n} colors are slightly off – GB Studio turns them into the right ones',
  'Farben': 'Colors',
  '1 leicht abweichend – passt': '1 slightly off – fine',
  '{n} leicht abweichend – passt': '{n} slightly off – fine',
  'mit Problemen': 'with problems',
  'Problem – wird in GB Studio zu': 'Problem – becomes in GB Studio',
  'wird gleich wie {c}': 'becomes the same as {c}',
  'Grenzfall': 'borderline',
  'Leicht abweichend – wird in GB Studio zu': 'Slightly off – becomes in GB Studio',
  'Rot markierte Farben liegen an einer Helligkeitsgrenze oder werden im Spiel gleich wie eine andere Farbe. Prüfe, ob das so gewollt ist.': 'Colors marked red sit at a brightness boundary or become the same as another color in the game. Check whether that is intended.',
  'Problemfarben': 'Problem colors',
  'Wie GB Studio übernehmen': 'Apply like GB Studio',
  'Leicht abweichende Farben sind kein Problem – GB Studio ordnet sie nach Helligkeit der richtigen der 4 Farben zu. Mit „Angleichen“ setzt Pixel Bro sie auf die genauen Werte.': 'Slightly off colors are no problem – GB Studio assigns them to the right one of the 4 colors by brightness. “Match” sets them to the exact values.',
  'Angleichen': 'Match',
  'Game Boy (klassisch): GB Studio kennt nur 4 Helligkeitsstufen und ordnet jede Farbe nach ihrem Grünanteil zu (ab 205 hellste, ab 130 hell, ab 65 dunkel, darunter dunkelste). Genaue HEX-Codes sind daher egal. Höchstens 192 verschiedene 8×8-Kacheln. Geprüft wird der aktuelle Frame.': 'Game Boy (classic): GB Studio only knows 4 brightness levels and assigns each color by its green value (205+ lightest, 130+ light, 65+ dark, below darkest). Exact HEX codes do not matter. At most 192 different 8×8 tiles. The current frame is checked.',
  'Geprüfter Tipp – damit reichen 7 Paletten:': 'Verified tip – this makes 7 palettes enough:',
  'Strg+Z macht es rückgängig': 'Ctrl+Z undoes it',
  '1 Farbe mit Problem': '1 color with a problem',
  '{n} Farben mit Problemen': '{n} colors with problems',
  'passt': 'fine',
  'Passt für den Game Boy': 'Ready for the Game Boy',
  'Passt noch nicht für den Game Boy': 'Not ready for the Game Boy yet',
  'Nur die erlaubten Farben': 'Only allowed colors',
  'Fremde Farben': 'Foreign colors',
  'alles erlaubt': 'all allowed',
  '1 Pixel': '1 pixel',
  '{n} Pixel': '{n} pixels',
  'Kacheln': 'Tiles',
  'Paletten': 'Palettes',
  'Passt in GB Studio': 'Ready for GB Studio',
  'Passt noch nicht in GB Studio': 'Not ready for GB Studio yet',
  '{n} von {max} Paletten': '{n} of {max} palettes',
  '{n} von {max} Kacheln': '{n} of {max} tiles',
  '8. passt zu deiner Palette 8': '8th matches your palette 8',
  'GB Studio ersetzt eine still': 'GB Studio silently replaces one',
  'frei für Hintergründe': 'free for backgrounds',
  'ohne Spiegeln: {n}': 'without flipping: {n}',
  'In GB Studio:': 'In GB Studio:',
  'Palette 8 · Text/UI deiner Szene': 'Palette 8 · text/UI of your scene',
  'HEX wie in GB Studio': 'HEX as shown in GB Studio',
  'GB-Studio-Vorgabe': 'GB Studio default',
  'So prüft Pixel Bro': 'How Pixel Bro checks',
  'Geprüfter Tipp – so reichen 7 Paletten (Doppelklick in „Benutzte Farben“):': 'Verified tip – this makes 7 palettes enough (double-click in “Used colors”):',
  'Palette {p} nutzt in GB Studio deine Palette 8 (Text/UI) – die Farben sind fast gleich, das passt.': 'Palette {p} uses your palette 8 (text/UI) in GB Studio – the colors are almost the same, that works.',
  '{n} Paletten zu viel – Kacheln mit Palette {p} bekommen in GB Studio falsche Farben. Farben angleichen oder ähnliche Kacheln zusammenfassen.': '{n} palettes too many – tiles with palette {p} get wrong colors in GB Studio. Match colors or combine similar tiles.',
  'Palette zu viel – {n} Kacheln bekommen in GB Studio andere Farben': 'Palette too many – {n} tiles get different colors in GB Studio',
  'Kacheln werden wie in GB Studio gezählt: gleiches Muster mit anderer Palette und gespiegelte Kacheln zählen nur einmal.': 'Tiles are counted like GB Studio: the same pattern with another palette and flipped tiles count only once.',
  '„6+“ im Bild: Die Kachel passt auch in andere Paletten und bekommt die Palette ihrer Nachbarn.': '“6+” in the image: the tile also fits other palettes and gets the palette of its neighbors.',
  'zu viel': 'too many',
  'Palette zu viel – nur {n} Kacheln': 'Palette too many – only {n} tiles',
  '1 Kachel hat mehr als 4 Farben – die überzähligen Pixel sind im Bild rot markiert. Färbe sie in eine der anderen Farben der Kachel um.': '1 tile has more than 4 colors – the extra pixels are marked red in the image. Recolor them with one of the tile\'s other colors.',
  '{n} Kacheln haben mehr als 4 Farben – die überzähligen Pixel sind im Bild rot markiert. Färbe sie in eine der anderen Farben der Kachel um.': '{n} tiles have more than 4 colors – the extra pixels are marked red in the image. Recolor them with one of the tile\'s other colors.',
  'Sprite – #65FF00 als Transparenz erlauben': 'Sprite – allow #65FF00 as transparency',
  'Fremde Farben sind im Bild rot markiert – ersetze sie durch eine der 4 Farben (z. B. mit „Farbe ersetzen“).': 'Foreign colors are marked red in the image – replace them with one of the 4 colors (e.g. with “Replace color”).',
  '1 Kachel zu viel – gleiche Bereiche wiederverwenden.': '1 tile too many – reuse identical areas.',
  '{n} Kacheln zu viel – gleiche Bereiche wiederverwenden.': '{n} tiles too many – reuse identical areas.',
  'Game Boy (klassisch): nur die 4 Grüntöne, höchstens 192 verschiedene 8×8-Kacheln. Geprüft wird der aktuelle Frame.': 'Game Boy (classic): only the 4 shades of green, at most 192 different 8×8 tiles. The current frame is checked.',
  'GB Studio (Farbmodus): Jede 8×8-Kachel nutzt eine Palette mit 4 Farben. 7 Paletten sind für Hintergründe frei, die 8. ist für Text und UI reserviert. Höchstens 384 verschiedene Kacheln. Geprüft wird der aktuelle Frame.': 'GB Studio (color mode): each 8×8 tile uses one palette with 4 colors. 7 palettes are free for backgrounds, the 8th is reserved for text and UI. At most 384 different tiles. The current frame is checked.',

  // ---------- Updates ----------
  'Die Browser-Version ist immer auf dem neuesten Stand': 'The browser version is always up to date',
  'Suche nach Updates …': 'Checking for updates …',
  'Pixel Bro ist aktuell (Version {v})': 'Pixel Bro is up to date (version {v})',
  'Update-Suche fehlgeschlagen: {msg}': 'Update check failed: {msg}',
  'Update {v} wird geladen …': 'Downloading update {v} …',
  'Update wird geladen …': 'Downloading update …',
  'Du kannst einfach weiterarbeiten.': 'You can just keep working.',
  'Version {v} ist bereit': 'Version {v} is ready',
  'Deine Arbeit wird vorher gesichert. „Später“ installiert beim Schließen.': 'Your work is saved first. “Later” installs when you close Pixel Bro.',
  'Jetzt neu starten': 'Restart now',
  'Später': 'Later',
  'Version {v} ist da': 'Version {v} is available',
  'Neue portable Version herunterladen und die alte Datei ersetzen.': 'Download the new portable version and replace the old file.',
  'Tipp: Mit dem Installer aktualisiert sich Pixel Bro selbst.': 'Tip: with the installer, Pixel Bro updates itself.',
  'Herunterladen': 'Download',
  'Update wird installiert …': 'Installing update …',
  'Pixel Bro startet gleich neu.': 'Pixel Bro will restart in a moment.',
  'Update konnte nicht gestartet werden': 'Update could not be started',

  // ---------- Namen ----------
  'Ebene': 'Layer',
  'Kopie': 'copy',
  'Eigene Palette': 'Custom palette',
  'Projekt': 'Project',
  'unbenannt': 'untitled',
};

/* Tasten in <kbd> und Tabellen: Strg → Ctrl usw. */
const KEY_WORDS = [[/Strg/g, 'Ctrl'], [/Umschalt/g, 'Shift'], [/\bEntf\b/g, 'Del'], [/Leertaste/g, 'Space']];

const I18N = {
  lang: 'de',
  set(lang) {
    this.lang = LANGS[lang] ? lang : 'de';
    document.documentElement.lang = this.lang;
    translateTree(document.body);
  },
};

/** Text übersetzen. vars ersetzt {platzhalter}. */
function t(de, vars) {
  let s = (I18N.lang === 'en' && EN[de]) || de;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

/** Standard-Ebenennamen („Ebene 3 Kopie“) in der Anzeige übersetzen – der gespeicherte Name bleibt. */
function layerLabel(name) {
  if (I18N.lang === 'en') {
    const m = /^Ebene (\d+)((?: Kopie)*)$/.exec(name);
    return m ? `Layer ${m[1]}${m[2].replace(/ Kopie/g, ' copy')}` : name;
  }
  const m = /^Layer (\d+)((?: copy)*)$/.exec(name);
  return m ? `Ebene ${m[1]}${m[2].replace(/ copy/g, ' Kopie')}` : name;
}

/* ---------- Automatische Übersetzung der Oberfläche ---------- */
const I18N_ATTRS = ['title', 'placeholder', 'label', 'aria-label'];

function translateString(de, kbd) {
  const trimmed = de.trim();
  if (!trimmed) return de;
  let en = EN[trimmed];
  if (en === undefined && kbd) {
    en = trimmed;
    for (const [re, rep] of KEY_WORDS) en = en.replace(re, rep);
  }
  if (en === undefined || en === trimmed) return de;
  const lead = de.slice(0, de.indexOf(trimmed)), trail = de.slice(de.indexOf(trimmed) + trimmed.length);
  return lead + en + trail;
}

function skipped(el) {
  return !el || el.closest('[data-i18n-skip], script, style, textarea, code');
}

function translateTextNode(node) {
  const el = node.parentElement;
  if (skipped(el)) return;
  if (node.__en !== undefined && node.data === node.__en) {
    // schon übersetzt – bei Wechsel auf Deutsch zurücksetzen
    if (I18N.lang === 'de') { const de = node.__de; node.__en = undefined; node.data = de; }
    return;
  }
  node.__de = node.data;
  node.__en = undefined;
  if (I18N.lang !== 'en') return;
  const kbd = el.tagName === 'KBD' || (el.tagName === 'TD' && !el.previousElementSibling);
  const en = translateString(node.data, kbd);
  if (en !== node.data) { node.__en = en; node.data = en; }
}

function translateAttrs(el) {
  if (skipped(el)) return;
  for (const a of I18N_ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const v = el.getAttribute(a);
    const store = el.__i18n || (el.__i18n = {});
    const rec = store[a];
    if (rec && v === rec.en) {
      if (I18N.lang === 'de') { rec.en = undefined; el.setAttribute(a, rec.de); }
      continue;
    }
    store[a] = { de: v, en: undefined };
    if (I18N.lang !== 'en') continue;
    const en = translateString(v, false);
    if (en !== v) { store[a].en = en; el.setAttribute(a, en); }
  }
}

function translateTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { translateTextNode(root); return; }
  if (root.nodeType !== 1) return;
  translateAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (n.nodeType === 3) translateTextNode(n); else translateAttrs(n);
  }
}

new MutationObserver((list) => {
  for (const m of list) {
    if (m.type === 'childList') m.addedNodes.forEach(translateTree);
    else if (m.type === 'characterData') translateTextNode(m.target);
    else if (m.type === 'attributes') translateAttrs(m.target);
  }
}).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
