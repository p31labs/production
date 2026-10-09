#!/usr/bin/env bash
# A3: verification. Governance-enforced checks FAIL (exit non-zero) on a hit; admin-only
# date/domain hits are WARN-only (A1 does not edit admin/, so they need manual review).
# Class I is governance-enforced in BOTH governance/ and admin/.
# rg exits 1 on "no match", which is the PASS case here, hence the leading '!'.
set -uo pipefail
fail=0
x1=(--glob '!*AUDIT*'); x2=(--glob '!governance/CHANGELOG.md')
# Class I remains (governance-enforced, both trees)
! rg -nP 'Class I(?!I)'      admin governance "${x1[@]}" "${x2[@]}" || { echo "FAIL: Class I remains in governance/admin"; fail=1; }
# Old date in governance/ -> FAIL
! rg -n  'March 24, 2026'    governance "${x1[@]}" "${x2[@]}" || { echo "FAIL: old date remains in governance/"; fail=1; }
# Old date in admin/ -> WARN only
if rg -n 'March 24, 2026' admin "${x1[@]}"; then echo "WARN: old date remains in admin/ (manual review; A1 does not edit admin)"; fi
# Old domain in governance/ -> FAIL
! rg -n  'p31labs\.org'      governance "${x1[@]}" "${x2[@]}" || { echo "FAIL: old domain remains in governance/"; fail=1; }
# Old domain in admin/ -> WARN only
if rg -n 'p31labs\.org' admin "${x1[@]}"; then echo "WARN: old domain remains in admin/ (manual review; A1 does not edit admin)"; fi
# MX: FAIL only if dig is present and finds no MX; if dig is missing, skip (do not fail).
if command -v dig >/dev/null 2>&1; then
  [ -n "$(dig +short MX p31ca.org 2>/dev/null)" ] || { echo "FAIL: no MX for p31ca.org"; fail=1; }
else
  echo "SKIP: dig not installed"
fi
[ -f inputs/mailbox_confirmed ] || { echo "BLOCKED(manual): confirm the p31ca.org mailboxes are monitored, then 'touch inputs/mailbox_confirmed'"; fail=1; }
exit $fail