!ifndef BUILD_UNINSTALLER
!include LogicLib.nsh
!include nsDialogs.nsh

Var CreateDesktopShortcut
Var CreateStartMenuShortcut
Var ShortcutDialog
Var ShortcutLabel
Var DesktopShortcutCheckbox
Var StartMenuShortcutCheckbox

!macro customInit
  StrCpy $CreateDesktopShortcut ${BST_CHECKED}
  StrCpy $CreateStartMenuShortcut ${BST_CHECKED}
!macroend

!macro customPageAfterChangeDir
  Page custom ShortcutOptionsPage ShortcutOptionsLeave
!macroend

Function ShortcutOptionsPage
  nsDialogs::Create 1018
  Pop $ShortcutDialog
  ${If} $ShortcutDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0u 0u 100% 24u "选择要创建的快捷方式："
  Pop $ShortcutLabel

  ${NSD_CreateCheckbox} 0u 34u 100% 12u "创建桌面快捷方式"
  Pop $DesktopShortcutCheckbox
  ${If} $CreateDesktopShortcut == ${BST_CHECKED}
    ${NSD_Check} $DesktopShortcutCheckbox
  ${EndIf}

  ${NSD_CreateCheckbox} 0u 56u 100% 12u "创建开始菜单快捷方式"
  Pop $StartMenuShortcutCheckbox
  ${If} $CreateStartMenuShortcut == ${BST_CHECKED}
    ${NSD_Check} $StartMenuShortcutCheckbox
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function ShortcutOptionsLeave
  ${NSD_GetState} $DesktopShortcutCheckbox $CreateDesktopShortcut
  ${NSD_GetState} $StartMenuShortcutCheckbox $CreateStartMenuShortcut
FunctionEnd

!macro customInstall
  ${If} ${FileExists} "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe"
    Delete "$INSTDIR\uninstall.exe"
    Rename "$INSTDIR\Uninstall ${PRODUCT_FILENAME}.exe" "$INSTDIR\uninstall.exe"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\uninstall.exe"
    ${If} $installMode == "all"
      StrCpy $0 "/allusers"
    ${Else}
      StrCpy $0 "/currentuser"
    ${EndIf}
    StrCpy $1 "$INSTDIR\uninstall.exe"
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString '"$1" $0'
    WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" QuietUninstallString '"$1" $0 /S'
  ${EndIf}

  ${If} $CreateDesktopShortcut != ${BST_CHECKED}
    WinShell::UninstShortcut "$newDesktopLink"
    Delete "$newDesktopLink"
  ${EndIf}
  ${If} $CreateStartMenuShortcut != ${BST_CHECKED}
    WinShell::UninstShortcut "$newStartMenuLink"
    Delete "$newStartMenuLink"
    StrCpy $launchLink "$appExe"
  ${EndIf}
!macroend
!endif

!macro customUnInstall
  Delete "$INSTDIR\uninstall.exe"
!macroend
