# Stellt den Update-Fehler „Die alten Anwendungsdateien konnten nicht deinstalliert werden …: 2“ nach:
# Pixel Bro wird installiert, eine Programmdatei ist gesperrt (wie bei einem Virenscanner, der sie gerade prüft),
# dann läuft das Update wie bei der automatischen Aktualisierung (--updated /S).
# Erwartet: Das Update läuft ohne Meldung durch (Exit-Code 0) und hängt nicht an einem Fehlerdialog.
$ErrorActionPreference = 'Stop'
$setup = (Resolve-Path 'dist/Pixel-Bro-Setup.exe').Path
$dir = Join-Path $env:LOCALAPPDATA 'Programs\pixel-bro'

Write-Host '1) Erstinstallation (still)'
$p = Start-Process $setup -ArgumentList '/S' -PassThru -Wait
Write-Host "   Exit-Code: $($p.ExitCode)"
if (!(Test-Path "$dir\Pixel Bro.exe")) { throw "Pixel Bro wurde nicht installiert ($dir)" }

$locked = Join-Path $dir 'resources\app.asar'
Write-Host "2) Datei sperren (wie ein Virenscanner): $locked"
$job = Start-Job -ScriptBlock {
  param($f)
  # Lesen erlaubt, Verschieben/Löschen nicht – genau das lässt den alten Deinstaller abbrechen
  $h = [System.IO.File]::Open($f, 'Open', 'Read', 'Read')
  Start-Sleep -Seconds 25
  $h.Close()
} -ArgumentList $locked
Start-Sleep -Seconds 3

Write-Host '3) Update wie bei der automatischen Aktualisierung (--updated /S)'
$u = Start-Process $setup -ArgumentList '--updated', '/S' -PassThru
if (!$u.WaitForExit(180000)) {
  Stop-Process -Id $u.Id -Force
  Get-Process | Where-Object { $_.ProcessName -like 'Pixel*' } | Stop-Process -Force -ErrorAction SilentlyContinue
  throw 'FEHLER: Das Update hängt – vermutlich an der Meldung „Die alten Anwendungsdateien konnten nicht deinstalliert werden …“'
}
Receive-Job $job -Wait -AutoRemoveJob | Out-Null
Write-Host "   Exit-Code: $($u.ExitCode)"
if ($u.ExitCode -ne 0) { throw "FEHLER: Update beendet mit Code $($u.ExitCode)" }
if (!(Test-Path "$dir\Pixel Bro.exe") -or !(Test-Path $locked)) { throw 'FEHLER: Programmdateien fehlen nach dem Update' }
Write-Host 'OK: Update trotz gesperrter Datei ohne Fehlermeldung durchgelaufen'
