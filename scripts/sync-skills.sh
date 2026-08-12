#!/usr/bin/env bash
# Deprecated compatibility wrapper for the Windows-first Node synchronizer.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/scripts/sync-skills.js" "$@"
