/* Pixel-Bro-Seite: Deutsch / Englisch
   - Umschalter DE | EN im Header, Wahl wird gemerkt (localStorage „bk.lang“)
   - Ohne gespeicherte Wahl: Browser-Sprache (deutsch → DE, sonst EN); ?lang=en / ?lang=de im Link geht vor
   - Elemente mit data-en="…" bekommen ihr ganzes HTML ersetzt, alle anderen Texte laufen über das Wörterbuch EN */
(() => {
  const EN = {
    // Header & Hero
    'Game Studio • by Bro Kartell': 'Game studio • by Bro Kartell',
    'Kontakt': 'Contact',
    'Werkzeug • Kostenlos • Deutsch & Englisch': 'Tool • Free • German & English',
    'Pixel-Art & Animationen – made by Bro Kartell': 'Pixel art & animations – made by Bro Kartell',
    'Unser eigener Pixel-Art- und Animations-Editor, auf Deutsch und Englisch. Damit entstehen Sprites, Tilesets und Animationen für unsere Spiele – und jetzt auch für deine.':
      'Our own pixel art and animation editor, in English and German. We use it to make sprites, tilesets and animations for our games – and now you can use it for yours.',
    '⬇ Download für Windows': '⬇ Download for Windows',
    '▶ Im Browser testen': '▶ Try it in your browser',
    '🖥️ Pixel Bro ist für den PC gemacht – öffne diese Seite am Rechner zum Herunterladen.': '🖥️ Pixel Bro is made for the PC – open this page on your computer to download it.',
    'Windows 10 / 11 (64 Bit) · Kostenlos ·': 'Windows 10 / 11 (64-bit) · Free ·',
    'weitere Downloads': 'more downloads',
    'alle Versionen': 'all versions',
    // Funktionen
    'Funktionen': 'Features',
    '✏️ Werkzeuge': '✏️ Tools',
    'Stift mit Pixel-Perfect, Radierer, Füllen, Pipette, Linie, Rechteck, Ellipse, Verlauf, Sprühdose, Text, Dithering und Aufhellen/Abdunkeln.':
      'Pixel-perfect pen, eraser, fill, eyedropper, line, rectangle, ellipse, gradient, spray can, text, dithering and lighten/darken.',
    'Frames per Drag & Drop sortieren, Live-Vorschau mit einstellbaren FPS und Zwiebelhaut.': 'Reorder frames by drag & drop, live preview with adjustable FPS and onion skin.',
    '📚 Ebenen': '📚 Layers',
    'Hinzufügen, duplizieren, sortieren, zusammenführen, ausblenden und Deckkraft einstellen.': 'Add, duplicate, reorder, merge, hide and set the opacity.',
    'Kachel-Modus für nahtlose Tiles mit 3×3-Vorschau und einstellbares Kachelraster.': 'Tile mode for seamless tiles with a 3×3 preview and an adjustable tile grid.',
    '🎨 Farben': '🎨 Colors',
    'PICO-8, Endesga 32, Game Boy, GB Studio & mehr, bis zu 20 eigene Paletten mit Namen – plus Live-Palette, die alle benutzten Farben erkennt.':
      'PICO-8, Endesga 32, Game Boy, GB Studio & more, up to 20 named custom palettes – plus a live palette that detects every color you use.',
    'Bilder und Spritesheets importieren, exportieren als PNG, Spritesheet oder animiertes GIF.': 'Import images and spritesheets, export as PNG, spritesheet or animated GIF.',
    // Downloads
    'Alle Varianten enthalten dasselbe Programm. Die Links zeigen immer auf die neueste Version.': 'All versions contain the same program. The links always point to the latest version.',
    'Eine einzelne EXE ohne Installation – perfekt für den USB-Stick. Meldet neue Versionen, Update per Download.': 'A single EXE without installation – perfect for a USB stick. Tells you about new versions, update by download.',
    'Windows-Warnung beim ersten Start?': 'Windows warning on first start?',
    'Wichtige Tastenkürzel': 'Important shortcuts',
    'Stift · Radierer · Füllen · Pipette': 'Pen · eraser · fill · eyedropper',
    'Rechtsklick': 'Right-click',
    'Mit der Zweitfarbe zeichnen': 'Draw with the secondary color',
    'Strg': 'Ctrl',
    'Rückgängig · Wiederholen': 'Undo · redo',
    'Verlauf · Text · Sprühdose': 'Gradient · text · spray can',
    'Neuer Frame': 'New frame',
    'Kachel-Modus': 'Tile mode',
    'Alle Tastenkürzel in der App': 'All shortcuts in the app',
    // Changelog
    '• Neue Werkzeuge & Englisch': '• New tools & English',
    'Verlauf – von Primär- zu Sekundärfarbe, mit Dithering-Muster oder in harten Stufen': 'Gradient – from primary to secondary color, with a dithering pattern or in hard steps',
    'Sprühdose – zufällige Pixel für Gras, Rauch oder Schmutz': 'Spray can – random pixels for grass, smoke or dirt',
    'Text – eingebaute Pixel-Schrift mit Umlauten, Ziffern und Satzzeichen': 'Text – built-in pixel font with umlauts, digits and punctuation',
    'Mittellinien durch die Bildmitte – Schalter „Mitte“ neben „Raster“': 'Center lines through the middle of the image – “Center” switch next to “Grid”',
    'Englisch als zweite Sprache – Ansicht → English': 'English as a second language – View → English',
    'Text hinterlässt nach dem Festsetzen keine Umrandung mehr, Werkzeugleiste geht bis ganz nach unten': 'Text no longer leaves an outline after placing it, the toolbar now reaches all the way down',
    '• Feinschliff': '• Polish',
    'Neues App-Icon – gezeichnet mit Pixel Bro selbst': 'New app icon – drawn with Pixel Bro itself',
    'GB-Studio-Paletten: „Sprites“ mit #65FF00 für Transparenz und „Hintergründe“': 'GB Studio palettes: “Sprites” with #65FF00 for transparency and “Backgrounds”',
    'Breitere Seitenleiste – alle Palettennamen passen ins Auswahlfeld': 'Wider sidebar – all palette names fit into the drop-down',
    'Update-Hinweis unten rechts, verdeckt beim Zeichnen nichts mehr': 'Update notice in the bottom right, no longer covers your drawing',
    'Gelöschte eigene Paletten bleiben nach einem Neustart gelöscht': 'Deleted custom palettes stay deleted after a restart',
    'Frames verzerren beim Drüberfahren nicht mehr, Vorschau zeigt auch große Bilder komplett': 'Frames no longer distort on hover, the preview shows large images completely',
    'Nur die Ebenen-Liste scrollt, nicht mehr die ganze Seitenleiste – und „100 %“ bei Deckkraft passt ins Feld': 'Only the layer list scrolls, not the whole sidebar – and “100 %” opacity fits into its box',
    '• Eigene Paletten': '• Custom palettes',
    'Bis zu 20 eigene Paletten, jede mit eigenem Namen – anlegen, umbenennen, löschen': 'Up to 20 custom palettes, each with its own name – create, rename, delete',
    '„Farben aus dem Bild übernehmen“ legt eine neue benannte Palette an': '“Use colors from the image” creates a new named palette',
    'Änderungen an Vorlagen landen automatisch in einer eigenen Kopie': 'Changes to presets automatically go into your own copy',
    '• Automatische Updates': '• Automatic updates',
    'Die installierte Version aktualisiert sich selbst – ein Klick auf „Jetzt neu starten“ genügt': 'The installed version updates itself – one click on “Restart now” is all it takes',
    'Portable und ZIP zeigen einen Hinweis, wenn es eine neue Version gibt': 'Portable and ZIP show a notice when there is a new version',
    'Verständlicher Dialog beim Schließen, Arbeit wird sofort gesichert': 'Clearer dialog when closing, your work is backed up right away',
    'Versionsnummer immer sichtbar neben „Pixel Bro“, breitere Menüs': 'Version number always visible next to “Pixel Bro”, wider menus',
    'Update ohne Fehlermeldung, auch wenn ein Virenscanner Dateien prüft': 'Updates without an error message, even while a virus scanner checks the files',
    'Pixel Bro veröffentlicht': 'Pixel Bro released',
    'Über-Fenster mit Entwickler, Homepage und Impressum': 'About window with developer, homepage and legal notice',
    'Live-Palette „Benutzte Farben“, Doppelklick ersetzt eine Farbe überall': 'Live palette “Used colors”, double-click replaces a color everywhere',
    'Scrollleisten an der Zeichenfläche, Schalter komplett lila': 'Scrollbars on the canvas, switches fully purple',
    'Idee & Umsetzung: izec313': 'Idea & development: izec313',
    'Gebaut mit Electron': 'Built with Electron',
    // Kontakt & Footer
    'Bug gefunden oder Idee für Pixel Bro?': 'Found a bug or have an idea for Pixel Bro?',
    'Schreib uns – neue Werkzeuge und Wünsche nehmen wir gern mit in die nächste Version.': 'Write to us – we are happy to add new tools and wishes to the next version.',
    'E-Mail an Bro Kartell Games': 'Email Bro Kartell Games',
    'Bro Kartell - Multigaming Clan seit 4 Okt. 2013': 'Bro Kartell – multigaming clan since Oct 4, 2013',
    '• Impressum': '• Legal notice',
    '• Datenschutz': '• Privacy policy',
    // Attribute
    'Pixel Bro: Editor mit animiertem Pixel-Charakter, Zeitleiste, Ebenen und Live-Palette': 'Pixel Bro: editor with an animated pixel character, timeline, layers and live palette',
  };
  const META = {
    de: { title: 'Pixel Bro — Bro Kartell Games', desc: 'Pixel Bro – kostenloser Pixel-Art- und Animations-Editor auf Deutsch und Englisch von Bro Kartell Games. Download für Windows oder direkt im Browser testen.' },
    en: { title: 'Pixel Bro — free pixel art editor by Bro Kartell Games', desc: 'Pixel Bro – free pixel art and animation editor in English and German by Bro Kartell Games. Download for Windows or try it right in your browser.' },
  };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ATTRS = ['alt', 'aria-label', 'title'];

  const textNodes = [];
  const attrEls = [];
  function collect() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement.closest('script, style, [data-en], .langSwitch')) continue;
      if (!n.data.trim()) continue;
      textNodes.push({ node: n, de: n.data });
    }
    document.querySelectorAll('[data-en]').forEach((el) => { el.dataset.de = el.innerHTML; });
    document.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => {
      const saved = {};
      ATTRS.forEach((a) => { if (el.hasAttribute(a)) saved[a] = el.getAttribute(a); });
      attrEls.push({ el, saved });
    });
  }
  function translate(de, isDate) {
    const s = de.trim();
    let en = EN[s.replace(/\s+/g, ' ')];
    if (en === undefined && isDate) {
      const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
      if (m) en = `${MONTHS[+m[2] - 1]} ${+m[1]}, ${m[3]}`;
    }
    if (en === undefined) return de;
    const i = de.indexOf(s);
    return de.slice(0, i) + en + de.slice(i + s.length);
  }
  function apply(lang) {
    const en = lang === 'en';
    document.documentElement.lang = lang;
    for (const t of textNodes) t.node.data = en ? translate(t.de, !!t.node.parentElement.closest('.cl-date')) : t.de;
    document.querySelectorAll('[data-en]').forEach((el) => { el.innerHTML = en ? el.dataset.en : el.dataset.de; });
    for (const { el, saved } of attrEls) for (const [a, v] of Object.entries(saved)) el.setAttribute(a, en ? translate(v) : v);
    document.title = META[lang].title;
    const d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', META[lang].desc);
    document.querySelectorAll('.langSwitch button').forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    const mail = document.getElementById('gamesMail');
    if (mail) mail.href = `mailto:${'games'}@${'bro-kartell.com'}?subject=${encodeURIComponent('Pixel Bro Feedback')}`;
  }
  function initial() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'de' || q === 'en') return q;
    try { const s = localStorage.getItem('bk.lang'); if (s === 'de' || s === 'en') return s; } catch (e) { /* egal */ }
    return /^de\b/i.test(navigator.language || 'de') ? 'de' : 'en';
  }
  collect();
  apply(initial());
  document.querySelectorAll('.langSwitch button').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('bk.lang', b.dataset.lang); } catch (e) { /* egal */ }
    apply(b.dataset.lang);
  }));
})();
