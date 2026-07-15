#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install
fi

(sleep 2 && open "http://localhost:3000") >/dev/null 2>&1 &
npm run dev
