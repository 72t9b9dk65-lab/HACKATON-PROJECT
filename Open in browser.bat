@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node

node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error('Node.js 22.13 or later is required: https://nodejs.org'); process.exit(1); }"
if errorlevel 1 goto failed

if exist "node_modules\.bin\vinext.cmd" goto start
echo Installing project dependencies...
call npm ci
if errorlevel 1 goto failed

:start
echo.
echo Opening Hundstallet in your browser...
echo Keep this window open. Press Ctrl+C to stop the site.
echo.
set "EARTHHEALTH_OPEN_BROWSER=1"
call npm run dev -- --hostname 127.0.0.1
if errorlevel 1 goto failed
exit /b 0

:missing_node
echo Install Node.js 22.13 or later from https://nodejs.org and reopen this file.
:failed
echo.
echo Unable to start.
pause
exit /b 1
