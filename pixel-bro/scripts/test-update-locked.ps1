# Stellt den Update-Fehler „Die alten Anwendungsdateien konnten nicht deinstalliert werden …: 2“ nach:
# Pixel Bro wird installiert, eine Programmdatei ist gesperrt (wie bei einem Virenscanner, der sie gerade prüft),
# dann läuft das Update wie bei der automatischen Aktualisierung (--updated /S).
#
#   A) Vergleich: Update mit dem Installer von 1.1.4 (letzte Version ohne Lösung) – hier sollte der Fehler auftreten
#   B) Update mit dem neu gebauten Installer (mit Lösung) – muss ohne Meldung durchlaufen
#
# Nur B entscheidet über Erfolg oder Misserfolg; A ist zur Kontrolle, ob der Test den Fehler wirklich nachstellt.
$ErrorActionPreference = 'Stop'
$newSetup = (Resolve-Path 'dist/Pixel-Bro-Setup.exe').Path
$oldSetup = Join-Path $env:RUNNER_TEMP 'Pixel-Bro-Setup-alt.exe'

function Get-InstallDir {
  foreach ($root in 'HKCU:', 'HKLM:') {
    $key = Get-ChildItem "$root\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue |
      Where-Object { (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue).DisplayName -like 'Pixel Bro*' } |
      Select-Object -First 1
    if ($key) {
      $p = Get-ItemProperty $key.PSPath
      if ($p.InstallLocation) { return $p.InstallLocation.Trim('"') }
      if ($p.UninstallString) { return Split-Path ($p.UninstallString -replace '^"([^"]+)".*$', '$1') }
    }
  }
  return $null
}

function Stop-PixelBro {
  Get-Process | Where-Object { $_.ProcessName -like 'Pixel*' -or $_.ProcessName -like 'old-uninstaller*' -or $_.ProcessName -like 'Un_*' } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}

function Test-LockedUpdate($setup, $label, $timeoutSec) {
  Write-Host "--- $label ---"
  Write-Host '1) Installation (still, nur für mich)'
  $p = Start-Process $setup -ArgumentList '/S', '/currentuser' -PassThru -Wait
  $dir = Get-InstallDir
  if (!$dir -or !(Test-Path (Join-Path $dir 'Pixel Bro.exe'))) {
    Write-Host "   Erster Versuch ohne Ergebnis (Code $($p.ExitCode)) – noch einmal"
    Start-Sleep -Seconds 5
    $p = Start-Process $setup -ArgumentList '/S', '/currentuser' -PassThru -Wait
    $dir = Get-InstallDir
  }
  Write-Host "   Exit-Code: $($p.ExitCode) · Ordner: $dir"
  if (!$dir -or !(Test-Path (Join-Path $dir 'Pixel Bro.exe'))) { throw "Pixel Bro wurde nicht installiert" }

  $locked = Join-Path $dir 'resources\app.asar'
  Write-Host "2) Datei sperren (wie ein Virenscanner): $locked"
  $job = Start-Job -ScriptBlock {
    param($f, $sec)
    # Lesen erlaubt, Verschieben/Löschen nicht – genau das lässt den alten Deinstaller abbrechen
    $h = [System.IO.File]::Open($f, 'Open', 'Read', 'Read')
    Start-Sleep -Seconds $sec
    $h.Close()
  } -ArgumentList $locked, 25
  Start-Sleep -Seconds 3

  Write-Host '3) Update wie bei der automatischen Aktualisierung (--updated /S)'
  $u = Start-Process $setup -ArgumentList '--updated', '/S' -PassThru
  $finished = $u.WaitForExit($timeoutSec * 1000)
  if (!$finished) { Stop-Process -Id $u.Id -Force -ErrorAction SilentlyContinue; Stop-PixelBro }
  Receive-Job $job -Wait -AutoRemoveJob -ErrorAction SilentlyContinue | Out-Null
  $result = if ($finished) { "beendet mit Code $($u.ExitCode)" } else { "HÄNGT (Fehlermeldung wartet auf OK)" }
  Write-Host "   Ergebnis: $result"
  return @{ Finished = $finished; ExitCode = $(if ($finished) { $u.ExitCode } else { -1 }); Dir = $dir }
}

function Remove-PixelBro($dir) {
  Stop-PixelBro
  $un = Get-ChildItem $dir -Filter 'Uninstall*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($un) { Start-Process $un.FullName -ArgumentList '/S', '/currentuser' -Wait -ErrorAction SilentlyContinue }
  # Der NSIS-Deinstaller kopiert sich selbst und läuft im Hintergrund weiter – warten, bis er wirklich fertig ist
  for ($i = 0; $i -lt 60; $i++) {
    $busy = Get-Process | Where-Object { $_.ProcessName -like 'Un_*' -or $_.ProcessName -like 'Uninstall*' -or $_.ProcessName -like 'Pixel*' }
    if (!$busy -and !(Get-InstallDir)) { break }
    Start-Sleep -Seconds 1
  }
  Stop-PixelBro
  Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}

# A) Vergleich mit 1.1.4 – der letzten Version ohne Lösung (ab 1.1.5 ist die Lösung in jedem Release enthalten)
Write-Host 'Lade Installer von Version 1.1.4 …'
Invoke-WebRequest 'https://github.com/brokartell/brokartell/releases/download/pixel-bro-v1.1.4/Pixel-Bro-Setup.exe' -OutFile $oldSetup
$a = Test-LockedUpdate $oldSetup 'A) Version 1.1.4 (ohne Lösung)' 90
Remove-PixelBro $a.Dir
if (!$a.Finished -or $a.ExitCode -ne 0) {
  Write-Host 'Kontrolle: Fehler ohne Lösung nachgestellt ✔'
} else {
  Write-Host '::warning::Kontrolle: Ohne Lösung trat der Fehler NICHT auf – der Test stellt ihn evtl. nicht nach'
}

# B) Mit dem neuen Installer (mit Lösung)
$b = Test-LockedUpdate $newSetup 'B) Neuer Installer (mit Lösung)' 180
if (!$b.Finished) { throw 'FEHLER: Update mit neuem Installer hängt – Meldung kommt noch' }
if ($b.ExitCode -ne 0) { throw "FEHLER: Update mit neuem Installer beendet mit Code $($b.ExitCode)" }
if (!(Test-Path (Join-Path $b.Dir 'Pixel Bro.exe')) -or !(Test-Path (Join-Path $b.Dir 'resources\app.asar'))) {
  throw 'FEHLER: Programmdateien fehlen nach dem Update'
}
Write-Host 'OK: Update trotz gesperrter Datei ohne Fehlermeldung durchgelaufen'
