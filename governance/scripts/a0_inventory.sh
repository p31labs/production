#!/usr/bin/env bash
# A0: inventory every occurrence the runbook may touch. Read-only. Fails only if rg itself errors (exit>1).
set -u
OUT="${1:-out/a0}"; mkdir -p "$OUT"
EXCL=(--glob '!*AUDIT*' --glob '!governance/CHANGELOG.md')
run() { rg "$@"; rc=$?; [ $rc -le 1 ] || { echo "rg failed ($rc)"; exit 2; }; }
run --json -nP 'March 24(, 2026)?' governance admin "${EXCL[@]}" > "$OUT/date_hits.jsonl"
run --json -nP 'p31labs\.org'      governance admin "${EXCL[@]}" > "$OUT/domain_hits.jsonl"
run --json -nP 'Class I(?!I)'      governance admin "${EXCL[@]}" > "$OUT/class_hits.jsonl"
# Corporate records (minutes, resolutions, signature blocks) are reported, never auto-edited.
run --json -nP 'March 24' admin/Corporate > "$OUT/corporate_hits.jsonl"
# File lists drive later steps (no hardcoded file lists).
run -lP 'March 24, 2026' governance "${EXCL[@]}" | sort -u > "$OUT/date_files.txt"
run -lP 'p31labs\.org'   governance "${EXCL[@]}" | sort -u > "$OUT/domain_files.txt"
for f in date domain class corporate; do
  printf '%-10s matches: %s\n' "$f" "$(grep -c '"type":"match"' "$OUT/${f}_hits.jsonl" 2>/dev/null || echo 0)"
done
echo "Review $OUT/corporate_hits.jsonl by hand: those records are not edited by this runbook."
