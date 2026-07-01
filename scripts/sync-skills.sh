#!/usr/bin/env bash
# Sync Cursor skills → Codex mirror. Run from repo root after editing .cursor/skills/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "${ROOT}/.agents/skills"
cp -r "${ROOT}/.cursor/skills" "${ROOT}/.agents/skills"
echo "Synced .cursor/skills/ → .agents/skills/"
diff -qr "${ROOT}/.cursor/skills" "${ROOT}/.agents/skills" && echo "Mirror check: OK"
