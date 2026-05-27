#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -d node_modules ]] && [[ "$(stat -c '%U' node_modules 2>/dev/null || echo '')" == "root" ]]; then
  echo "Fixing root-owned node_modules (usually from Docker)..."
  sudo chown -R "$(whoami):$(whoami)" node_modules
fi

npm install
exec npm run dev
