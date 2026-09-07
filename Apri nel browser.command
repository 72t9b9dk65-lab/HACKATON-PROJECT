#!/bin/bash
set -e

cd -- "$(dirname -- "$0")"
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

pause_on_error() {
  printf '\nAvvio non riuscito. Premi Invio per chiudere.\n'
  read -r _
}
trap pause_on_error ERR

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf 'Installa Node.js 22.13 o successivo da https://nodejs.org e riapri questo file.\n'
  pause_on_error
  exit 1
fi

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error("Serve Node.js 22.13 o successivo: https://nodejs.org"); process.exit(1); }'

if [ ! -x node_modules/.bin/vinext ]; then
  printf 'Installazione delle dipendenze del progetto…\n'
  npm ci
fi

printf '\nAvvio di earthealth nel browser…\nLascia aperto questo Terminale. Per fermare il sito premi Ctrl+C.\n\n'
export EARTHHEALTH_OPEN_BROWSER=1
npm run dev -- --hostname 127.0.0.1
