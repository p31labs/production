#!/usr/bin/env bash
# Usage: scripts/gate.sh <input-file>...   Exits 1 unless every file exists, is non-empty, and contains no TODO.
for f in "$@"; do
  { [ -s "$f" ] && ! grep -q TODO "$f"; } || { echo "BLOCKED: $f missing, empty, or still contains TODO"; exit 1; }
done
