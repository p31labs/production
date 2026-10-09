#!/usr/bin/env bash
# P31 Shell — fast gate (per edit cycle). ~2 min.
# tsc + vite build + design-gate color audit.
# NOTE: the 5-min browser suite (verify-shell.cjs) and the 25-case unit suite
# (vitest) are reserved for staging/pre-launch per project workflow.
set -euo pipefail
cd /home/p31/production/shell

echo "▶ tsc --noEmit"
./node_modules/.bin/tsc --noEmit

echo "▶ vite build"
./node_modules/.bin/vite build >/dev/null

echo "▶ design-gate: zero bare hardcoded hex in UI (Canvas/Three.js/viz palettes exempt)"
# AGENTS.md Design Gate: zero hardcoded hex except Canvas/Three.js. Exemption
# policy (review before widening): Canvas/Three.js material colors, the GL
# force-graph canvas (ResearchViz), the 2D tetrahedron/canvas diagrams, and
# visualization palettes expressed as named constants (Tailwind palette values
# used by viz modules) are exempt. Token fallbacks var(--x, #hex) allowed.
HEX=$(grep -Er "#[0-9a-f]{6}" src --include="*.tsx" --include="*.css" | grep -v "//" \
      | grep -vE "var\([^)]*,[^)]*#[0-9a-f]{6}\)" \
      | grep -vE "src/features/ship/" \
      | grep -vE "src/components/(ResearchViz|TetrahedronVisualizer|ForceGraph|GraphSurface)\.tsx" \
      | grep -vE "src/features/bonding/BondingSurface\.tsx" \
      | grep -vE "src/components/hud/RightHardwareHUD\.tsx" \
      | grep -vE "qrcode|toDataURL" \
      || true)
if [ -n "$HEX" ]; then echo "❌ bare hardcoded hex:"; echo "$HEX"; exit 1; fi
echo "✓ no bare hardcoded hex (viz palettes exempted)"

echo "fast gate: all green"
