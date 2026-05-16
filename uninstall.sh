#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_ENTRY="${SCRIPT_DIR}/dist/cli/agent-gate.js"

echo "=== agent-gate uninstaller (git-clone mode) ==="
echo ""
echo "Note: if you installed via 'npm install -g agent-gate',"
echo "you can run 'agent-gate uninstall' directly instead of this script."
echo ""

if [[ ! -f "$DIST_ENTRY" ]]; then
  echo "ERROR: ${DIST_ENTRY} not found. Run ./install.sh first, or use 'agent-gate uninstall' if installed globally."
  exit 1
fi

node "$DIST_ENTRY" uninstall
