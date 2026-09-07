@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node

node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error('Serve Node.js 22.13 o successivo: https://nodejs.org'); process.exit(1); }"
if errorlevel 1 goto failed

if exist "node_modules\.bin\vinext.cmd" goto start
echo Installazione delle dipendenze del progetto...
call npm ci
if errorlevel 1 goto failed

:start
echo.
echo Avvio di earthealth nel browser...
echo Lascia aperta questa finestra. Per fermare il sito premi Ctrl+C.
echo.
set "EARTHHEALTH_OPEN_BROWSER=1"
call npm run dev -- --hostname 127.0.0.1
if errorlevel 1 goto failed
exit /b 0

:missing_node
echo Installa Node.js 22.13 o successivo da https://nodejs.org e riapri questo file.
:failed
echo.
echo Avvio non riuscito.
pause
exit /b 1
