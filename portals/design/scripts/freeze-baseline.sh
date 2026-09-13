#!/bin/bash
# P31 Design System — Baseline Freeze
# Records the current "gold" state of the design portal for regression comparison.
set -euo pipefail

PORTAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="$PORTAL_DIR/.baseline"
DATE=$(date +%Y-%m-%d)
mkdir -p "$OUTPUT_DIR"

echo "1. Frozen dist artifacts (hash)"
if [ -d "$PORTAL_DIR/dist" ]; then
  (cd "$PORTAL_DIR/dist" && sha256sum index.html assets/* > "$OUTPUT_DIR/dist-$DATE.sha256")
else
  echo "  no dist/ present"
fi

echo "2. Locked dependency graph"
cp "$PORTAL_DIR/pnpm-lock.yaml" "$OUTPUT_DIR/pnpm-lock-$DATE.yaml"

echo "3. Test log export"
(cd "$PORTAL_DIR" && pnpm test -- --reporter=json --outputFile="$OUTPUT_DIR/test-results-$DATE.json") || \
  echo "  test run failed (see output above); baseline continues"

echo "4. Source tree inventory"
find "$PORTAL_DIR/src" -type f | sort > "$OUTPUT_DIR/src-tree-$DATE.txt"

echo "Baseline frozen to: $OUTPUT_DIR"
echo "Gate: verify visual parity at https://p31-portal-design.pages.dev"