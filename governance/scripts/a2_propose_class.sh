#!/usr/bin/env bash
# A2: PROPOSE only. Classification is a regulatory determination, so this never edits files.
set -euo pipefail
mkdir -p out
EX=inputs/ecfr_890_3710_excerpt.txt
[ -s "$EX" ] && ! grep -q TODO "$EX" || { echo "BLOCKED: paste the verified eCFR 21 CFR 890.3710 text into $EX (Q2). A scripted fetch may be blocked by network allowlists; do it manually if so."; exit 1; }
{
  echo "# Proposed classification edits (NOT APPLIED). For regulatory counsel."
  echo "# Each hit is shown with context; counsel decides the replacement wording."
  rg -nP -C1 'Class I(?!I)' admin governance --glob '!*AUDIT*' || true
} > out/a2_class_proposal.md
echo "Wrote out/a2_class_proposal.md"
