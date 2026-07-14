!macro NSIS_HOOK_POSTINSTALL
  SetShellVarContext current
  CreateShortCut "$DESKTOP\Atena.lnk" "$INSTDIR\app.exe" "" "$INSTDIR\app.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  SetShellVarContext current
  Delete "$DESKTOP\Atena.lnk"
!macroend
