#!/usr/bin/env bash
# Erzeugt die Release-Beschreibung für eine Version aus CHANGELOG.md.
set -euo pipefail
VERSION="$1"
NOTES=$(awk -v v="## $VERSION" '$0 == v {f=1; next} /^## / {f=0} f' CHANGELOG.md)
if [ -z "${NOTES//[[:space:]]/}" ]; then
  echo "Kein Eintrag für Version $VERSION in CHANGELOG.md" >&2
  exit 1
fi
cat <<MD
## Neu in Version $VERSION
$NOTES

## Download
| Datei | Wofür |
|---|---|
| **Pixel-Bro-Setup.exe** | Installer mit Startmenü- und Desktop-Verknüpfung (empfohlen) |
| **Pixel-Bro-Portable.exe** | Eine einzelne EXE, ohne Installation (z. B. für den USB-Stick) |
| **Pixel-Bro-Windows.zip** | Zum Entpacken, dann *Pixel Bro.exe* starten |

*latest.yml* und *Pixel-Bro-Setup.exe.blockmap* braucht Pixel Bro für die automatischen Updates – nicht löschen.

**Hinweis:** Pixel Bro ist nicht digital signiert. Windows zeigt beim ersten Start deshalb evtl. die
SmartScreen-Warnung – auf *„Weitere Informationen“* und dann *„Trotzdem ausführen“* klicken.

Läuft unter Windows 10 und 11 (64 Bit).

---
Entwickelt von Jens Niebisch für [Bro Kartell](https://bro-kartell.com) – Multigaming Clan seit 2013.
MD
