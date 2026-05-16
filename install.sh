#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_ENTRY="${SCRIPT_DIR}/dist/cli/agent-gate.js"

echo "=== agent-gate installer (git-clone mode) ==="
echo ""
echo "Note: if you installed via 'npm install -g agent-gate',"
echo "you can run 'agent-gate install' directly instead of this script."
echo ""

cd "$SCRIPT_DIR"

if [[ ! -d "node_modules" ]]; then
  echo "[1/2] Installing dependencies..."
  npm install
fi

if [[ ! -f "$DIST_ENTRY" ]]; then
  echo "[1/2] Building..."
  npm run build

  if [[ ! -f "$DIST_ENTRY" ]]; then
    echo "ERROR: Build failed — ${DIST_ENTRY} not found"
    exit 1
  fi
else
  echo "[1/2] dist/ found, skipping build."
fi

echo "[2/2] Registering hook via CLI..."
node "$DIST_ENTRY" install
