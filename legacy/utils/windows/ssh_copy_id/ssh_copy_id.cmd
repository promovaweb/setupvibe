@echo off
setlocal EnableExtensions

where pwsh.exe >nul 2>&1
if errorlevel 1 (
    set "SETUPVIBE_POWERSHELL=powershell.exe"
) else (
    set "SETUPVIBE_POWERSHELL=pwsh.exe"
)

set "SETUPVIBE_SSH_COPY_ID_CORE=%~dp0ssh_copy_id_core.ps1"
if not exist "%SETUPVIBE_SSH_COPY_ID_CORE%" set "SETUPVIBE_SSH_COPY_ID_CORE=%~dp0ssh_copy_id.ps1"

"%SETUPVIBE_POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SETUPVIBE_SSH_COPY_ID_CORE%" %*
exit /b %ERRORLEVEL%
