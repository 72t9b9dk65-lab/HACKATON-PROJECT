#!/bin/bash
set -e

cd -- "$(dirname -- "$0")"
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

pause_on_error() {
  printf '\nUnable to start. Press Enter to close.\n'
  read -r _
}
trap pause_on_error ERR

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  printf 'Install Node.js 22.13 or later from https://nodejs.org and reopen this file.\n'
  pause_on_error
  exit 1
fi

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error("Node.js 22.13 or later is required: https://nodejs.org"); process.exit(1); }'

if [ ! -x node_modules/.bin/vinext ]; then
  printf 'Installing project dependencies…\n'
  npm ci
fi

printf '\nOpening Hundstallet in your browser…\nKeep this Terminal open. Press Ctrl+C to stop the site.\n\n'
npm run db:local
export EARTHHEALTH_OPEN_BROWSER=1
npm run dev:isolated
