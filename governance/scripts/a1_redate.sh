#!/usr/bin/env bash
# A1: re-date + domain fix, driven by the A0 file lists. Refuses to run without human-supplied inputs.
set -euo pipefail
OUT="${1:-out/a0}"
W=inputs/instrument_wording.txt
[ -s "$W" ] && ! grep -q 'TODO' "$W" || { echo "BLOCKED: fill $W with the exact approval phrase from the April 11 instrument (Q1)"; exit 1; }
[ -s inputs/counsel_approach.txt ] && ! grep -q TODO inputs/counsel_approach.txt || { echo "BLOCKED: record re-date vs re-adopt decision in inputs/counsel_approach.txt (Q5)"; exit 1; }
{ [ -s governance/CHANGELOG.md ] && ! grep -q 'TODO' governance/CHANGELOG.md; } || \
{ [ -s governance/templates/CHANGELOG.entry.md ] && ! grep -q 'TODO' governance/templates/CHANGELOG.entry.md; } || \
{ echo "BLOCKED: draft governance/CHANGELOG.md from governance/templates/CHANGELOG.entry.md with counsel-approved text (no TODO). Either governance/CHANGELOG.md or governance/templates/CHANGELOG.entry.md must exist and contain no TODO."; exit 1; }
APPROVAL="$(cat "$W")"; export APPROVAL
# 1) approval line first (so the global replace cannot pre-empt it)
while read -r f; do perl -pi -e 's/Approved by Board of Directors: March 24, 2026/$ENV{APPROVAL}/g' "$f"; done < "$OUT/date_files.txt"
# 2) remaining dates
while read -r f; do perl -pi -e 's/March 24, 2026/April 11, 2026/g' "$f"; done < "$OUT/date_files.txt"
# 3) domain (all files found by inventory, including CONTRACTS/)
while read -r f; do perl -pi -e 's/\@p31labs\.org/\@p31ca.org/g' "$f"; done < "$OUT/domain_files.txt"
echo "A1 done. Files touched: $(cat "$OUT/date_files.txt" "$OUT/domain_files.txt" | sort -u | wc -l)"
