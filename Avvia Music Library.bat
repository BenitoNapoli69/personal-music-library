@echo off
REM Music Library Manager - Launcher
REM Avvia l'applicazione nel browser predefinito

echo.
echo ========================================
echo   Music Library Manager
echo   Avvio in corso...
echo ========================================
echo.

REM Apri index.html nel browser predefinito
start "" "%~dp0index.html"

echo Applicazione avviata nel browser!
echo.
echo Puoi chiudere questa finestra.
timeout /t 3 >nul
