; Zusätze für den Pixel-Bro-Installer (electron-builder, nsis.include)
;
; Problem: Beim Update deinstalliert der Installer zuerst die alte Version. Hält in dem Moment ein anderes
; Programm (z. B. ein Virenscanner beim Prüfen) eine Programmdatei offen, bricht der alte Deinstaller ab und es
; erscheint „Die alten Anwendungsdateien konnten nicht deinstalliert werden … : 2“.
;
; Lösung: Diese Meldung nicht zeigen, sondern einfach weiter installieren. Der Installer überschreibt die alten
; Dateien danach ohnehin (mit mehreren Versuchen und notfalls ohne Rücksicht auf Sperren).
; Der Code des alten Deinstallers steht in $R0 (0 = alles gut).

!macro pixelBroUninstallCheck
  ${if} ${Errors}
    DetailPrint "Alter Deinstaller konnte nicht gestartet werden - Installation wird fortgesetzt."
    ClearErrors
  ${elseif} $R0 != 0
    DetailPrint "Alte Version liess sich nicht vollstaendig entfernen (Code $R0) - Dateien werden ueberschrieben."
  ${endif}
!macroend

; Installation für den aktuellen Benutzer bzw. passend zum Installationsmodus
!macro customUnInstallCheck
  !insertmacro pixelBroUninstallCheck
!macroend

; Zusätzliche Prüfung einer älteren Installation „nur für mich“, wenn für alle Benutzer installiert wird
!macro customUnInstallCheckCurrentUser
  !insertmacro pixelBroUninstallCheck
!macroend
